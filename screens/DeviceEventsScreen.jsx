import { useStyles } from '../style/useStyles';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState, useMemo, memo, useCallback, useContext } from 'react';
import { get } from '../lib/request';
import { formatDateTime } from '../lib/date';
import { isEmpty } from '../lib/util';
import deviceInfoContext from '../lib/context/deviceInfoContext';

const DATE_INTERVAL = 7 * 86400 * 1000;
const keyExtractor = e => e.id;

export default DeviceEventsScreen = () => {
	const [canLoadMore, setCanLoadMore] = useState(false);
	const [events, setEvents] = useState([]);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [currentDate, setCurrentDate] = useState(new Date());
	const { device } = useContext(deviceInfoContext);

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
			paddingHorizontal: 14,
			paddingVertical: 10,
		},
		eventDate: {
			...s.text.caption,
			width: 110,
		},
		eventType: {
			...s.text.base,
			fontWeight: '500',
			flex: 1,
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
	}));

	const getPreviousInterval = useCallback(
		() => new Date(currentDate.getTime() - DATE_INTERVAL),
		[currentDate]
	);

	const fetchEvents = useCallback(async () => {
		setError(false);
		setLoading(true);

		const previousDate = getPreviousInterval();
		const params = new URLSearchParams({
			deviceId: device.id,
			from: previousDate.toISOString(),
			to: currentDate.toISOString(),
		});

		params.append("type", "deviceStopped");
		params.append("type", "deviceMoving");
		params.append("type", "alarm");
		params.append("type", "ignitionOn");
		params.append("type", "ignitionOff");
		params.append("type", "commandResult");

		try {
			const evts = (await get(`reports/events?${params.toString()}`))?.data || [];
			setLoading(false);
			if (evts.length) setCanLoadMore(true);
			return evts;
		} catch (ex) {
			setError(true);
		} finally {
			setLoading(false);
		}
	}, [getPreviousInterval, currentDate, device]);

	useEffect(() => {
		fetchEvents().then(evts => {
			if (evts?.length) {
				setEvents(prev => [...prev, ...evts.reverse()]);
			} else {
				setCanLoadMore(false);
			}
		});
	}, [fetchEvents]);

	useEffect(() => {
		return () => {
			setCanLoadMore(false);
			setCurrentDate(new Date());
			setEvents([]);
		};
	}, []);

	const onEndReached = ({ distanceFromEnd }) => {
		if (!canLoadMore || distanceFromEnd < 0 || loading || !events.length) return;
		setCurrentDate(getPreviousInterval());
	};

	const ItemComponent = memo(({ item }) => (
		<View style={styles.eventCard}>
			<View style={styles.eventRow}>
				<Text style={styles.eventDate}>{formatDateTime(item.serverTime || item.eventTime)}</Text>
				<Text style={styles.eventType}>{item.type}</Text>
			</View>
			{Object.keys(item?.attributes || {}).map((k, index) => (
				<View style={styles.attrRow} key={index}>
					<Text style={styles.attrKey}>{k}</Text>
					<Text style={styles.attrValue}>{item.attributes[k]}</Text>
				</View>
			))}
		</View>
	));

	const eventItemRenderer = useCallback((props) => <ItemComponent {...props} />, []);

	const FooterListComponent = useMemo(() => (loading || error) && (
		<View style={styles.empty}>
			{error && <Text style={styles.errorText}>Při načítání nastala chyba</Text>}
			{loading && <ActivityIndicator size="small" />}
		</View>
	), [loading, error]);

	const EmptyListComponent = useMemo(() => !loading && (
		<View style={styles.empty}>
			<Text style={styles.emptyText}>Nejsou k dispozici žádné záznamy</Text>
		</View>
	), [loading]);

	return (
		<FlatList
			style={styles.flatList}
			data={events}
			keyExtractor={keyExtractor}
			renderItem={eventItemRenderer}
			ListEmptyComponent={EmptyListComponent}
			ListFooterComponent={FooterListComponent}
			onEndReachedThreshold={0.01}
			onEndReached={onEndReached}
		/>
	);
};
