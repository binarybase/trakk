import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CACHE_METHOD, cachedGet } from '../request';
import { getYearMonthRange, whichMonthPart } from '../date';
import { debug, log, warn } from '../logger';

const MODULE = 'useReportData';
const STARTING_DATE_PART = 3;
const keyExtractor = (t) => t?.startTime;

/**
 * Custom hook that manages report data fetching with:
 * - Date-based pagination (week parts within a month)
 * - Pull-to-refresh
 * - Load-more on scroll end
 * - Caching support
 *
 * @param {Object} options
 * @param {Object} options.currentDevice - Currently selected device
 * @param {string} options.reportType - API report endpoint (e.g. 'cachedTrips.php', 'stops')
 * @param {Function} [options.keyExtractorFn] - Key extractor for deduplication
 * @returns {Object} Report state and control functions
 */
export const useReportData = ({
	currentDevice,
	reportType,
	keyExtractorFn = keyExtractor,
}) => {
	const [currentDatePart, setCurrentDatePart] = useState(STARTING_DATE_PART);
	const [currentDate, setCurrentDate] = useState(getYearMonthRange(undefined));
	const [items, setItems] = useState([]);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [canRefresh, setCanRefresh] = useState(false);
	const [canLoadMore, setCanLoadMore] = useState(false);

	// Track force-load-more for empty partitions
	const forceLoadMoreRef = useRef(false);

	const pruneItems = useCallback(
		(newItems, oldItems) =>
			newItems.filter(
				(t1) => oldItems.findIndex((t2) => keyExtractorFn(t2) === keyExtractorFn(t1)) === -1
			),
		[keyExtractorFn]
	);

	const getLatestDate = useCallback(() => {
		const maxDate = Math.max(...items.map((t) => +new Date(keyExtractorFn(t))));
		return !isNaN(maxDate) && maxDate > 0 ? new Date(maxDate) : null;
	}, [items, keyExtractorFn]);

	/**
	 * Fetches report data for a given date range.
	 */
	const fetchItems = useCallback(
		async (dt, cacheMethod = CACHE_METHOD.PREFER_CACHE) => {
			if (!currentDevice?.id) return [];

			debug(
				MODULE,
				'fetchItems()',
				'device',
				currentDevice.id,
				'range',
				dt.firstDay.toISOString(),
				dt.lastDay.toISOString()
			);

			const params = new URLSearchParams({
				deviceId: currentDevice.id,
				from: dt.firstDay.toISOString(),
				to: dt.lastDay.toISOString(),
			});

			const response = await cachedGet(
				`reports/${reportType}?${params.toString()}`,
				cacheMethod
			);
			return (response?.data || []).reverse();
		},
		[currentDevice, reportType]
	);

	/**
	 * Loads the initial batch of report items.
	 */
	const loadInitial = useCallback(async () => {
		if (!currentDevice?.id) return;

		setError(null);
		setLoading(true);

		try {
			const range = getYearMonthRange(currentDate.firstDay, STARTING_DATE_PART);
			const data = await fetchItems(range);
			setItems(data);
		} catch (ex) {
			warn(MODULE, 'loadInitial failed', String(ex));
			setError('Načítání selhalo');
		} finally {
			setLoading(false);
			setCanLoadMore(true);
			setCanRefresh(true);
		}
	}, [currentDevice, currentDate, fetchItems]);

	/**
	 * Pull-to-refresh handler: fetches new data from latest known entry to now.
	 */
	const onRefresh = useCallback(async () => {
		if (!canRefresh || refreshing || !currentDevice?.id) return;

		setRefreshing(true);
		try {
			const dateNow = new Date();
			const latest = getLatestDate() || currentDate.firstDayOfMonth;

			for (
				let i = whichMonthPart(latest), len = whichMonthPart(dateNow);
				i <= len;
				i++
			) {
				const refreshRange = getYearMonthRange(latest, i);
				log(MODULE, 'refreshing', refreshRange.firstDay, '->', refreshRange.lastDay);

				const newRecords = await fetchItems(refreshRange, CACHE_METHOD.PREFER_NETWORK);
				setItems((prev) => {
					const pruned = pruneItems(newRecords, prev);
					return pruned.length ? [...pruned, ...prev] : prev;
				});
			}
		} catch (ex) {
			warn(MODULE, 'refresh exception', ex);
		} finally {
			setRefreshing(false);
		}
	}, [canRefresh, refreshing, currentDevice, currentDate, getLatestDate, fetchItems, pruneItems]);

	/**
	 * Load-more handler: loads the previous week partition.
	 */
	const onEndReached = useCallback(async () => {
		if (!canLoadMore || loading || loadingMore) return;

		debug(MODULE, 'onEndReached', 'part', currentDatePart);

		if (currentDatePart <= 0) {
			debug(MODULE, 'reached beginning of month');
			setCanLoadMore(false);
			return;
		}

		setLoadingMore(true);
		setCanRefresh(false);

		const prevPart = currentDatePart - 1;
		const prevRange = getYearMonthRange(currentDate.firstDay, prevPart);
		let shouldForceMore = false;

		try {
			const data = await fetchItems(prevRange);
			setCurrentDatePart(prevPart);

			if (data.length) {
				setItems((prev) => [...prev, ...pruneItems(data, prev)]);
			} else {
				shouldForceMore = true;
			}
		} catch (ex) {
			warn(MODULE, 'onEndReached failed', ex);
		} finally {
			setLoadingMore(false);
			setCanRefresh(true);
		}

		// Recursively load more if partition was empty
		if (shouldForceMore && prevPart > 0) {
			forceLoadMoreRef.current = true;
		}
	}, [canLoadMore, loading, loadingMore, currentDatePart, currentDate, fetchItems, pruneItems]);

	// Force load more for empty partitions
	useEffect(() => {
		if (forceLoadMoreRef.current) {
			forceLoadMoreRef.current = false;
			onEndReached();
		}
	}, [currentDatePart, onEndReached]);

	// Auto-refresh when items list is empty after initial load
	useEffect(() => {
		if (items.length === 0 && canRefresh && !loading && !refreshing) {
			onRefresh();
		}
	}, [items.length, canRefresh, loading, refreshing, onRefresh]);

	/**
	 * Updates the date range (e.g. from month picker).
	 */
	const setMonth = useCallback((date) => {
		setCurrentDatePart(STARTING_DATE_PART);
		setCurrentDate(getYearMonthRange(date));
	}, []);

	/**
	 * Resets state for device change.
	 */
	const reset = useCallback(() => {
		setCurrentDatePart(STARTING_DATE_PART);
		setItems([]);
		setCanRefresh(false);
		setCanLoadMore(false);
	}, []);

	const sortedItems = useMemo(
		() => [...items].sort((a, b) => new Date(keyExtractorFn(b)) - new Date(keyExtractorFn(a))),
		[items, keyExtractorFn]
	);

	return {
		items: sortedItems,
		loading,
		loadingMore,
		refreshing,
		error,
		currentDate,
		currentDatePart,
		canLoadMore,
		onRefresh,
		onEndReached,
		loadInitial,
		setMonth,
		reset,
	};
};
