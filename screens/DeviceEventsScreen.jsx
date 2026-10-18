import { useStyles } from '../style/useStyles';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState, useMemo, memo, useCallback, useRef } from 'react';
import { get } from '../lib/request';
import { formatDateTime } from '../lib/date';
import { eventLabel } from '../lib/eventTypes';
import { useDeviceInfo } from '../lib/context/deviceInfoContext';

const PAGE_MS = 7 * 86400 * 1000;
// stop looking further back after this many weeks without events
const MAX_EMPTY_PAGES = 4;
const EVENT_TYPES = ['deviceStopped', 'deviceMoving', 'alarm', 'ignitionOn', 'ignitionOff', 'commandResult'];
const keyExtractor = e => String(e.id);

const EventItem = memo(({ item, styles }) => (
	<View style={styles.eventCard}>
		<View style={styles.eventRow}>
			<Text style={styles.eventType}>{eventLabel(item.type)}</Text>
			<Text style={styles.eventDate}>{formatDateTime(item.eventTime || item.serverTime)}</Text>
		</View>
		{Object.entries(item.attributes || {}).map(([key, value]) => (
			<View style={styles.attrRow} key={key}>
				<Text style={styles.attrKey}>{key}</Text>
				<Text style={styles.attrValue}>{String(value)}</Text>
			</View>
		))}
	</View>
));

export default function DeviceEventsScreen() {
	const { id: deviceId } = useDeviceInfo();
	const [events, setEvents] = useState([]);
	// end of the page being loaded, pages go back in time
	const [until, setUntil] = useState(() => new Date());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [canLoadMore, setCanLoadMore] = useState(true);
	const [retryToken, setRetryToken] = useState(0);
	const emptyPagesRef = useRef(0);

	const [styles] = useStyles(s => ({
		flatList: {
			flex: 1,
		},
		empty: {
			flex: 1,
			paddingVertical: 32,
			alignItems: 'center',
		},
		eventCard: {
			marginHorizontal: 16,
			marginTop: 10,
			backgroundColor: s.cardBg,
			borderRadius: 12,
			overflow: 'hidden',
		},
		eventRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: 14,
			paddingVertical: 10,
		},
		eventDate: {
			...s.text.caption,
		},
		eventType: {
			...s.text.base,
			fontWeight: '600',
			flex: 1,
			marginRight: 8,
		},
		attrRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			paddingHorizontal: 14,
			paddingVertical: 6,
			borderTopWidth: 0.5,
			borderTopColor: s.separator,
		},
		attrKey: {
			...s.text.caption,
		},
		attrValue: {
			...s.text.caption,
			fontWeight: '500',
		},
		errorText: {
			...s.text.note,
			textAlign: 'center',
			color: s.colors.red,
		},
		emptyText: {
			...s.text.note,
			textAlign: 'center',
		},
		linkText: {
			...s.text.base,
			color: s.colors.blue.primary,
			fontWeight: '500',
		},
	}));

	useEffect(() => {
		let cancelled = false;
		const from = new Date(+until - PAGE_MS);
		const params = new URLSearchParams({
			deviceId,
			from: from.toISOString(),
			to: until.toISOString(),
		});
		EVENT_TYPES.forEach((type) => params.append('type', type));

		setLoading(true);
		setError(false);
		get(`reports/events?${params.toString()}`)
			.then((response) => {
				if (cancelled) return;
				if (response.status !== 200) {
					setError(true);
					return;
				}

				const page = (response.data || []).reverse();
				setEvents((prev) => {
					const known = new Set(prev.map(keyExtractor));
					return [...prev, ...page.filter((e) => !known.has(keyExtractor(e)))];
				});

				// quiet weeks don't grow the list, so scrolling can't ask for more: look further back
				emptyPagesRef.current = page.length ? 0 : emptyPagesRef.current + 1;
				if (!page.length) {
					if (emptyPagesRef.current < MAX_EMPTY_PAGES) {
						setUntil(from);
					} else {
						setCanLoadMore(false);
					}
				}
			})
			.finally(() => !cancelled && setLoading(false));

		return () => {
			cancelled = true;
		};
	}, [deviceId, until, retryToken]);

	const onEndReached = useCallback(() => {
		if (!canLoadMore || loading || error || !events.length) return;
		setUntil((current) => new Date(+current - PAGE_MS));
	}, [canLoadMore, loading, error, events.length]);

	const retry = useCallback(() => setRetryToken((n) => n + 1), []);

	const renderItem = useCallback(({ item }) => <EventItem item={item} styles={styles} />, [styles]);

	const ListFooterComponent = useMemo(() => (loading || error) && (
		<View style={styles.empty}>
			{error && (
				<TouchableOpacity onPress={retry} accessibilityRole="button">
					<Text style={styles.errorText}>Při načítání nastala chyba</Text>
					<Text style={styles.linkText}>Zkusit znovu</Text>
				</TouchableOpacity>
			)}
			{loading && <ActivityIndicator size="small" />}
		</View>
	), [styles, loading, error, retry]);

	const ListEmptyComponent = useMemo(() => !loading && !error && (
		<View style={styles.empty}>
			<Text style={styles.emptyText}>Nejsou k dispozici žádné záznamy</Text>
		</View>
	), [styles, loading, error]);

	return (
		<FlatList
			style={styles.flatList}
			data={events}
			keyExtractor={keyExtractor}
			renderItem={renderItem}
			ListEmptyComponent={ListEmptyComponent}
			ListFooterComponent={ListFooterComponent}
			onEndReachedThreshold={0.2}
			onEndReached={onEndReached}
		/>
	);
}
