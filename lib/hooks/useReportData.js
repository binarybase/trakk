import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CACHE_METHOD, cachedGet } from '../request';
import { getYearMonthRange, isCurrentMonth, MONTH_PARTS, whichMonthPart } from '../date';
import { debug, warn } from '../logger';

const MODULE = 'useReportData';
const keyExtractor = (t) => t?.startTime;

/**
 * Custom hook that manages report data of one month for one device:
 * - Date-based pagination (partitions within a month, newest first)
 * - Pull-to-refresh
 * - Load-more on scroll end
 * - Caching of finished partitions
 *
 * Every load is bounded: a month has MONTH_PARTS partitions and each is
 * requested at most once per load, load-more or refresh.
 *
 * @param {Object} options
 * @param {number} options.deviceId - Currently selected device id
 * @param {string} options.reportType - API report endpoint (e.g. 'cachedTrips.php', 'stops')
 * @param {Function} [options.keyExtractorFn] - Key extractor for deduplication and ordering
 * @returns {Object} Report state and control functions
 */
export const useReportData = ({
	deviceId,
	reportType,
	keyExtractorFn = keyExtractor,
}) => {
	// any date within the displayed month
	const [monthDate, setMonthDate] = useState(() => new Date());
	const [items, setItems] = useState([]);
	// lowest (oldest) partition loaded so far
	const [lowestPart, setLowestPart] = useState(MONTH_PARTS - 1);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [reloadToken, setReloadToken] = useState(0);

	// bumped whenever device or month changes; responses of older loads are dropped
	const generationRef = useRef(0);
	const busyRef = useRef(false);
	// a ref, so an inline extractor can't retrigger loading on every render
	const keyRef = useRef(keyExtractorFn);
	keyRef.current = keyExtractorFn;

	const currentDate = useMemo(() => getYearMonthRange(monthDate), [monthDate]);

	const mergeItems = useCallback((...lists) => {
		const key = keyRef.current;
		const byKey = new Map();
		lists.flat().forEach((item) => byKey.set(key(item), item));
		return [...byKey.values()].sort((a, b) => new Date(key(b)) - new Date(key(a)));
	}, []);

	/**
	 * Newest partition worth loading: today's for the current month, the last one otherwise.
	 */
	const topPart = useCallback(
		() => (isCurrentMonth(monthDate) ? whichMonthPart(new Date()) : MONTH_PARTS - 1),
		[monthDate]
	);

	/**
	 * Fetches one partition.
	 * Finished partitions don't change, so they are served from cache unless `fresh`.
	 * The open one is always fetched; its copy is kept apart and only used offline.
	 */
	const fetchPart = useCallback(async (part, fresh = false) => {
		const range = getYearMonthRange(monthDate, part);
		if (range.firstDay > new Date()) {
			return [];
		}

		debug(MODULE, 'fetchPart', deviceId, part, range.firstDay.toISOString(), range.lastDay.toISOString());

		const params = new URLSearchParams({
			deviceId,
			from: range.firstDay.toISOString(),
			to: range.lastDay.toISOString(),
		});
		const endpoint = `reports/${reportType}?${params.toString()}`;
		const response = range.isFuture
			? await cachedGet(endpoint, CACHE_METHOD.PREFER_NETWORK, `open:GET${endpoint}`)
			: await cachedGet(endpoint, fresh ? CACHE_METHOD.PREFER_NETWORK : CACHE_METHOD.PREFER_CACHE);

		if (response?.status !== 200) {
			throw new Error(`${reportType} request failed with status ${response?.status}`);
		}
		return response.data || [];
	}, [deviceId, reportType, monthDate]);

	/**
	 * Loads partitions downwards from `fromPart` until one has data or the month start is reached.
	 */
	const loadDownFrom = useCallback(async (fromPart, generation) => {
		let part = fromPart;
		let data = await fetchPart(part);
		while (!data.length && part > 0 && generation === generationRef.current) {
			part -= 1;
			data = await fetchPart(part);
		}
		return { part, data };
	}, [fetchPart]);

	// ─── Initial load on device / month change ───────────────────────

	useEffect(() => {
		const generation = ++generationRef.current;
		busyRef.current = false;
		setItems([]);
		setError(null);
		setLoadingMore(false);
		setRefreshing(false);

		if (!deviceId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		loadDownFrom(topPart(), generation)
			.then(({ part, data }) => {
				if (generation !== generationRef.current) return;
				setLowestPart(part);
				setItems(mergeItems(data));
			})
			.catch((ex) => {
				if (generation !== generationRef.current) return;
				warn(MODULE, 'initial load failed', String(ex));
				setError('Načítání selhalo');
			})
			.finally(() => {
				if (generation === generationRef.current) setLoading(false);
			});
	}, [deviceId, loadDownFrom, topPart, mergeItems, reloadToken]);

	/**
	 * Runs fn unless another load is in progress; drops its state updates once stale.
	 */
	const exclusive = useCallback(async (setBusy, fn) => {
		if (busyRef.current || loading || !deviceId) return;

		const generation = generationRef.current;
		busyRef.current = true;
		setBusy(true);
		try {
			await fn(() => generation === generationRef.current);
		} catch (ex) {
			warn(MODULE, 'load failed', String(ex));
		} finally {
			if (generation === generationRef.current) {
				busyRef.current = false;
				setBusy(false);
			}
		}
	}, [loading, deviceId]);

	/**
	 * Pull-to-refresh handler: reloads every loaded partition from the network.
	 */
	const onRefresh = useCallback(() => exclusive(setRefreshing, async (isCurrent) => {
		const parts = [];
		for (let part = lowestPart, top = Math.max(lowestPart, topPart()); part <= top; part++) {
			parts.push(part);
		}

		const results = await Promise.all(parts.map((part) => fetchPart(part, true)));
		if (isCurrent()) {
			setItems(mergeItems(...results));
		}
	}), [exclusive, lowestPart, topPart, fetchPart, mergeItems]);

	/**
	 * Load-more handler: loads older partitions of the month.
	 */
	const onEndReached = useCallback(() => {
		if (lowestPart <= 0) return;

		return exclusive(setLoadingMore, async (isCurrent) => {
			const generation = generationRef.current;
			const { part, data } = await loadDownFrom(lowestPart - 1, generation);
			if (isCurrent()) {
				setLowestPart(part);
				setItems((prev) => mergeItems(prev, data));
			}
		});
	}, [exclusive, lowestPart, loadDownFrom, mergeItems]);

	const reload = useCallback(() => setReloadToken((n) => n + 1), []);

	return {
		items,
		loading,
		loadingMore,
		refreshing,
		error,
		currentDate,
		canLoadMore: lowestPart > 0,
		onRefresh,
		onEndReached,
		setMonth: setMonthDate,
		reload,
	};
};
