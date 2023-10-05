import { useStyles } from '../style/useStyles';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState, useMemo, memo, useCallback, useContext } from 'react';
import { get } from '../lib/request';
import { formatDateTime } from '../lib/date';  
import { isEmpty } from '../lib/util';
import deviceInfoContext from '../lib/context/deviceInfoContext';

// 7 days ago
const DATE_INTERVAL = 7 * 86400 * 1000;
const keyExtractor = e => e.id;

export default DeviceEventsScreen = ({ navigation, route }) => {
	const getPreviousInterval = () => new Date(currentDate.getTime() - DATE_INTERVAL);
	const [ canLoadMore, setCanLoadMore ] = useState(false);
	const [ events, setEvents ] = useState([]);
	const [ error, setError ] = useState(null);
	const [ loading, setLoading ] = useState(false);
	const [ currentDate, setCurrentDate ] = useState(new Date());
	const { device } = useContext(deviceInfoContext);
	const [ styles ] = useStyles(s => ({
		flatList: {
			flex: 1,
			padding: 10
		},
		empty: {
			flex: 1,
			padding: 10
		},
		flatListItem: {
			flexDirection: 'row',
			flex: 1,
			paddingBottom: 3
		}
	}));

	/**
	 * fetches events from endpoint
	 * 
	 * @returns Array of events
	 */
	const fetchEvents = useCallback(async () => {
		// reset state
		setError(false);
		setLoading(true);

		// week ago
		const previousDate = getPreviousInterval();
		const params = new URLSearchParams({
			deviceId: device.id,
			from: previousDate.toISOString(),
			to: currentDate.toISOString()
		});

		// append most used event types
		params.append("type", "deviceStopped");
		params.append("type", "deviceMoving");
		params.append("type", "alarm");
		params.append("type", "ignitionOn");
		params.append("type", "ignitionOff");
		params.append("type", "commandResult");

		try {
			const events = (await get(`reports/events?${params.toString()}`))?.data || [];
			setLoading(false);
			// enable load more if we fetched some records
			events.length && setCanLoadMore(true);

			return events;
		} catch(ex){
			setError(true);
		} finally {
			setLoading(false);
		}
	}, [ currentDate ]);

	/**
	 * fetches event when current date changes
	 * load more
	 */
	useEffect(() => {
		fetchEvents().then(evts => {
			// append events
			if(evts && evts.length){
				setEvents([...events, ...evts.reverse()]);
				return;
			}

			// no records available
			setCanLoadMore(false);
		})		
	}, [ currentDate ])

	/**
	 * fetches events at load
	 */
	useEffect(() => {
		return () => {
			setCanLoadMore(false);
			setCurrentDate(new Date());
			setEvents([]);
		}
	}, [ ]);

	/**
	 * fetches new events when end is reached
	 */
	const onEndReached = ({ distanceFromEnd }) => {
		if(!canLoadMore || distanceFromEnd < 0 || loading || !events.length) return;
		// move interval 7 days before
		setCurrentDate(getPreviousInterval());
	}

	const ItemComponent = memo(({ item }) => (
		<>
			<View style={styles.flatListItem}>
				<View style={{ width: 100 }}>
					<Text style={styles.text.base}>{formatDateTime(item.serverTime)}</Text>
				</View>
				<View style={{ width: 140 }}>
					<Text style={styles.text.base}>{item.type}</Text>
				</View>
			</View>
			{Object.keys(item?.attributes || {}).map((k, index) => (
				<View style={styles.flatListItem} key={index}>
					<Text style={styles.text.base}>{k}</Text>
					<Text style={styles.text.base}>{item.attributes[k]}</Text>
				</View>
			))}
			{!isEmpty(item?.attributes) && (
				<View style={{ height: 2 }}></View>
			)}
		</>
	));
	const eventItemRenderer = (props) => (<ItemComponent {...props} />);

	// footer
	const FooterListComponent = useMemo(() => (loading || error) && (
		<View style={styles.empty}>
			{error && (<Text style={{ textAlign: 'center' }}>Při načítání nastala chyba</Text>)}
			{loading && (<ActivityIndicator size={"small"} />)}
		</View>
	), [ loading ]);

	// displayed when list is empty
	const EmptyListComponent = useMemo(() => (
		<View style={styles.empty}>
			<Text style={styles.text.base}>Nejsou k dispozici žádné záznamy</Text>
		</View>
	), [ ]);

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
	)
}