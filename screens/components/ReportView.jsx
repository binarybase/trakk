import MapView, { Polyline, Marker } from 'react-native-maps';
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { colors, useStyles } from "../../style/useStyles";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, RefreshControlComponent } from 'react-native';
import { isDeviceMoving, useDevicesContext } from '../../lib/context/devicesContext';
import { CACHE_METHOD, cachedGet, download, EXCEL_TYPE, get } from '../../lib/request';
import { formatDate, getYearMonthRange, now, whichMonthPart } from '../../lib/date';
import { useAppContext } from '../../lib/context/appContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { getRegionForCoordinates } from '../../lib/maputil';
import LoadingView from './LoadingView';
import DeviceMarker from './DeviceMarker';
import { faCalendar } from '@fortawesome/free-regular-svg-icons/faCalendar';
import MonthPicker, { ACTION_DATE_SET } from 'react-native-month-year-picker';
import { useFocusedTabEffect } from '../../lib/hooks/useFocusedTab';
import Share from 'react-native-share';
import { alert } from '../../lib/alert';
import { faFileArrowDown } from '@fortawesome/free-solid-svg-icons/faFileArrowDown';
import { log, debug, warn } from '../../lib/logger';

const STARTING_DATE_PART = 3;
const MODULE = 'ReportView';
const TEXT_LOADING_FAILED = "Načítání selhalo";
const keyExtractor = t => t?.startTime;

export default ReportView = ({
	reportType = "trips",
	reportTitle = "Trasy",
	reportItemRenderer,
	reportKeyExtractor = keyExtractor
}) => {
	const { setHeaderTitle, setHeaderRight } = useAppContext();
	const { devices, currentDevice, setCurrentDevice } = useDevicesContext();
	const mapViewRef = useRef();
	const [ styles, theme ]= useStyles(s => ({
		container: {
			flex: 1
		},
		mapContainer: {
			flex: 0.7
		},
		map: {
			flex: 1
		},
		flatList: {
			flex: 1,
			overflowX: 'scroll'
		},
		empty: {
			flex: 1,
			padding: 10
		},
		loading: {
			position: 'absolute',
			top: 0,
			left: 0,
			backgroundColor: 'rgba(0,0,0,0.5)',
			width: '100%',
			height: '100%',
			justifyContent: 'center',
			alignItems: 'center'
		},
		rightHeaderButton: {
			marginRight: 10,
			padding: 7
		},
		listItem: {
			flexDirection: 'row',
			borderBottomColor: "rgba(120,120,120, 0.5)",
			borderBottomWidth: 1,
			padding: 5
		},
		listItemSelected: {
			backgroundColor: 'rgba(0,0,0,0.3)'
		},
		refreshText: {
			...s.text.base,
			alignSelf: 'center'
		},
		overlay: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: '#0008'
		},
		overlayInner: {
			borderRadius: 5,
			backgroundColor: s.bg,
			justifyContent: 'center',
			alignItems: 'center',
			alignSelf: 'center',
			flexDirection: 'column',
			shadowColor: '#000',
			shadowOffset: {
				width: 0,
				height: 2
			},
			shadowOpacity: 0.25,
			shadowRadius: 4,
			elevation: 5,
			width: 215,
			height: 120,
			margin: 20
		},
		overlayText: {
			marginVertical: 10,
			textAlign: 'center',
			fontSize: 17,
			color: s.fg
		}
	}));
	
	// state
	const [ currentDatePart, setCurrentDatePart ] = useState(STARTING_DATE_PART);
	const [ currentDate, setCurrentDate ] = useState(getYearMonthRange(undefined, STARTING_DATE_PART));
	const [ downloading, setDownloading ] = useState(false);
	const [ loading, setLoading ] = useState();
	const [ error, setError ] = useState();
	const [ trips, setTrips ] = useState([]);
	const [ selection, setSelection ] = useState();
	const [ selectionCoords, setSelectionCoords ] = useState([]);
	const [ selectionPoint, setSelectionPoint ] = useState();
	const [ loadingCoords, setLoadingCoords ] = useState(false);
	const [ displayPicker, setDisplayPicker ] = useState(false);
	const [ loadingMore, setLoadingMore ] = useState(false);
	const [ refreshing, setRefreshing ] = useState(false);
	const [ canLoadMore, setCanLoadMore ] = useState(true);
	
	const currentDevicePosition = devices?.find(d => d.id === currentDevice?.id)?.position || currentDevice?.position || {};
	const pruneTrips = (newTrips, oldTrips) => newTrips.filter(t1 => oldTrips.findIndex(t2 => keyExtractor(t2) === keyExtractor(t1)) === -1);
	const getLatestDate = () => {
		const maxDate = Math.max(...trips.map(t => +new Date(keyExtractor(t))));
		return !isNaN(maxDate) && maxDate > 0 ? new Date(maxDate) : null;
	}

	/**
	 * downloads Excel report from Traccar
	 * and opens share dialog with file
	 */
	const downloadReport = async () => {
		const reportFile = `${reportTitle}_${currentDevice.name}`;
		const params = new URLSearchParams({
			deviceId: currentDevice.id,
			from: currentDate.firstDayOfMonth.toISOString(),
			to: currentDate.lastDayOfMonth.toISOString()
		})

		setDownloading(true);

		try {
			// download using RnFetchBlob
			const response = await download(`reports/${reportType}?${params.toString()}`, reportFile);
			if(!response){
				alert('Stažení selhalo - soubor neobsahuje žádná data');
				return;
			}

			const { path, unlink } = response;
			if(!path){
				alert('Stažení selhalo - soubor neobsahuje žádná data');
				return;
			}

			// share options
			const options = {
				type: EXCEL_TYPE,
				message: `${reportType} - ${currentDevice.name}`,
				url: path,
				failOnCancel: false
			}

			// wait for modal close completion
			setTimeout(() => {
				Share.open(options).then(unlink);
			}, 500)
			//await new Promise(resolve => setTimeout(resolve, 1000));
		} catch(ex){
			console.error('downloadReport failed', ex);
			alert("Stažení selhalo");
		} finally{
			// modal should be closed before share dialog opens
			// if finally with close is used, it closes also share dialog
			setDownloading(false);
		}
	}

	/**
	 * 
	 * @param {Object} coords {lat, lng} coordinates
	 */
	const panToPointMarker = (coords) => {
		if(!coords) return;
		setSelectionPoint(coords);
		mapViewRef.current?.animateToRegion({
			...coords,
			latitudeDelta: 0.05,
			longitudeDelta: 0.05
		});
	}

	
	/**
	 * fetches trips from endpoint by date range
	 * 
	 * @param {DateTime} dt
	 * @param {CACHE_METHOD} cacheMethod
	 * @returns {Array}
	*/
	const fetchTrips = useCallback(async (dt, cacheMethod = CACHE_METHOD.PREFER_CACHE) => {
		if(!currentDevice || !currentDevice.id) return;
		debug(MODULE, 'fetchTrips()', 'device', currentDevice.id, 'range', dt.firstDay.toISOString(), dt.lastDay.toISOString(), 'method', cacheMethod);
		const params = new URLSearchParams({
			deviceId: currentDevice.id,
			from: dt.firstDay.toISOString(),
			to: dt.lastDay.toISOString()
		})
		return ((await cachedGet(`reports/${reportType}?${params.toString()}`, cacheMethod))?.data || []).reverse();
	}, [ currentDevice ]);
	
	/**
	 * loads trips for the month and its first week
	*/
	const loadTrips = useCallback(async () => {
		setError(null);
		setLoading(true);
		
		try {
			setTrips(await fetchTrips(currentDate));
			mapViewRef?.current?.animateToRegion([{
				latitude: currentDevice.position.latitude,
				longitude: currentDevice.position.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01
			}]);
		} catch(ex){
			error(MODULE, 'fetchTrips failed', ex);
			setError(TEXT_LOADING_FAILED);
		} finally {
			setLoading(false);
		}
	}, [ currentDevice, currentDate ]);
	
	/**
	 * when month changes, it will load new trips from first week of the month
	 */
	const onMonthPickerChange = useCallback((e, date) => {
		// hide picker
		setDisplayPicker(false);
		
		// update date only when user changed previous date
		if(e !== ACTION_DATE_SET)
		return;
		
		setCurrentDatePart(STARTING_DATE_PART);
		setCurrentDate(getYearMonthRange(date, STARTING_DATE_PART));
	}, []);
	
	/**
	 * handles refresh control
	*/
	const onRefresh = useCallback(() => {
		if(loadingMore) return;
		debug(MODULE, 'refreshing data', currentDate);
		// already refreshing
		if(refreshing || !currentDate || !currentDate.isCurrentMonth) return;

		// async looper
		const loopAsync = async () => {
			debug(MODULE, 'latest', getLatestDate(), currentDate.lastDayOfMonth);
			const dateNow = new Date();
			const latest = getLatestDate() || currentDate.firstDayOfMonth;
			if(!latest){
				return;
			}

			// reload data from API with refreshing true
			setRefreshing(true);
			// get ranges since latest data to current date
			for(let i = whichMonthPart(latest), len = whichMonthPart(dateNow); i <= len; i++){
				const refreshRange = getYearMonthRange(latest, i);
				try {
					log(MODULE, 'refreshing since', refreshRange.firstDay, '->', refreshRange.lastDay, 'range id', i);
					const newRecords = await fetchTrips({
						firstDay: refreshRange.firstDay,
						lastDay: refreshRange.lastDay
					}, CACHE_METHOD.PREFER_NETWORK);
				
					log(MODULE, 'new data', newRecords.length, 'records');

					const pruned = pruneTrips(newRecords, trips);
					console.log(pruned.map(keyExtractor));
					setTrips([...pruned, ...trips]);
				} catch(ex){
					warn(MODULE, 'refreshing exception', ex);
				}
			}

			setRefreshing(false);
		}

		// execute async loop
		loopAsync();

	}, [ currentDevice, currentDate, refreshing, trips, loadingMore ]);
	
	// load trips when device changes
	useEffect(() => {
		// reset date part to zero
		setSelectionPoint({});
		setSelectionCoords([]);
		// reset to end of the week again
		setCurrentDatePart(STARTING_DATE_PART);
		
		// select first one
		if(currentDevice === undefined && devices.length){
			setCurrentDevice(devices[0]);
			return;
		}
		
		if(!currentDevice || !currentDate) return;
		
		// load trips
		loadTrips();
		
		// reset variables on hot reload
		return () => {
			setCurrentDatePart(STARTING_DATE_PART);
			setTrips([]);
			setSelection(null);
			setCanLoadMore(true);
		}
		
	}, [ currentDevice, currentDate ]);

	/**
	 * starts loading of the previous week
	 */
	useEffect(() => {
		// execute only when loading more is requested and can load more data
		if(!loadingMore || !canLoadMore) return;

		// load previous week and append data to existing
		const prevWeek = getYearMonthRange(currentDate.firstDay, currentDatePart);

		debug(MODULE, 'loading more range', currentDatePart, '/', 3, prevWeek.firstDay, prevWeek.lastDay);
		fetchTrips(prevWeek).then(prevWeekData => {
			// no additional data available
			if(currentDatePart <= 0){
				setCanLoadMore(false);
			}

			// append prev week data to the end of the list
			if(!prevWeekData.length) return;
			setTrips([...trips, ...(pruneTrips(prevWeekData, trips))]);
		}).finally(() => {
			// iterate over until we get the past
			if(prevWeek.isFuture){
				setCurrentDatePart(currentDatePart - 1);
				return;
			}

			setLoadingMore(false);
		})

	}, [ canLoadMore, loadingMore, currentDatePart ]);
	
	// update header when tab changes
	useFocusedTabEffect(isFocused => {
		if(!isFocused) return;
		setHeaderTitle(`${reportTitle} - ${currentDevice?.name}`);
		setHeaderRight(() => () => <RightIconComponent />);
	}, [ currentDevice ]);
	
	/**
	 * loads route points and renders on the map based on selected list item
	*/
	useEffect(() => {
		if(!selection || !selection.startTime || !selection.endTime)
			return; 
		
		setLoadingCoords(true);
		const from = new Date(selection.startTime)?.toISOString();
		const to = new Date(selection.endTime)?.toISOString();
		const params = new URLSearchParams({
			deviceId: currentDevice.id,
			from,
			to
		})
		
		if(!from || !to){
			return;
		}
		
		get(`reports/route?${params.toString()}`).then(response => {
			setSelectionCoords(response.data);
			
			if(!response.data || !response.data.length || response.data.length < 2)
			return;
			
			const startCoord = response.data[0];
			const endCoord = response.data[response.data.length - 1];
			
			if(!startCoord || !endCoord)
			return;
			
			mapViewRef.current.animateToRegion(getRegionForCoordinates([startCoord, endCoord]));
			mapViewRef.current.setZoom(mapViewRef.current.getZoom() - 3);
		}).catch(ex => {
			
		}).finally(() => {
			setLoadingCoords(false);
		})
	}, [ selection ]);
	
	// action buttons
	const RightIconComponent = useCallback(() => (
		<View style={{ flexDirection: 'row' }}>
			<TouchableOpacity style={styles.rightHeaderButton} onPress={() => setDisplayPicker(true)}>
				<FontAwesomeIcon icon={faCalendar} size={20} color={styles.colors.blue.primary} />
			</TouchableOpacity>
			<TouchableOpacity style={styles.rightHeaderButton} onPress={downloadReport}>
				<FontAwesomeIcon icon={faFileArrowDown} size={20} color={styles.colors.blue.primary} />
			</TouchableOpacity>
		</View>
	), [ theme, currentDevice, currentDate ]);
	// footer
	const FooterListComponent = useMemo(() => loadingMore && (
		<View style={styles.empty}>
			<ActivityIndicator size={"small"} />
		</View>
	), [ loadingMore ]);
	// displayed when list is empty
	const EmptyListComponent = useMemo(() => !loadingMore && (
		<View style={styles.empty}>
			<Text style={styles.text.base}>Pro období od {formatDate(currentDate.firstDayOfMonth)} do {formatDate(currentDate.lastDayOfMonth)} nejsou k dispozici žádné záznamy</Text>
		</View>
	), [ currentDate, loadingMore ]);
	
	// item renderer
	const tripItemRenderer = useCallback(({ item }) => reportItemRenderer({
		item,
		setSelection,
		selection,
		currentDevice,
		styles,
		selectionPoint,
		setSelectionPoint,
		panToPointMarker
	}), [ currentDevice, theme, selection, selectionPoint ]);
	
	/**
	 * loads next week when end of the list has been reached (load more)
	 * when end is reached also refreshes the last cached response
	 */
	const onEndReached = useCallback(() => {
		debug(MODULE, 'onEndReached', currentDatePart);
		// already loading
		if(loadingMore || currentDatePart <= 0){
			setLoadingMore(false);
			setCurrentDatePart(0);
			debug(MODULE, 'onEndReached: skipping load');
			return;
		}

		// move to previous week
		setCurrentDatePart(currentDatePart - 1);
		setLoadingMore(true);
	}, [ loadingMore, currentDatePart ]);


	return loading || error ? (
		<LoadingView error={error} />
	) : (
		<View style={styles.container}>
			{/*<View>
				<Text style={styles.text.base}>loadMore: {loadingMore ? 'YES' : 'NO'}, part: {currentDatePart}, range: {formatDate(currentDate?.firstDay)} - {formatDate(currentDate?.lastDay)}</Text>
			</View>*/}
			<View style={styles.mapContainer}>
				<MapView
					style={styles.map}
					ref={mapViewRef}
					showsUserLocation={true}
					showsMyLocationButton={true}
					showsTraffic={true}
					zoomEnabled={true}
				>
					{currentDevice && <DeviceMarker device={{
						...currentDevice,
						position: currentDevicePosition,
						moving: isDeviceMoving({
							...currentDevice,
							position: currentDevicePosition
						})
					}} />}
					{selectionPoint && (
						<Marker coordinate={selectionPoint} identifier='point' pinColor={colors.red} />
					)}
					{selectionCoords && selectionCoords.length >= 2 && (<>
						<Marker coordinate={selectionCoords[0]} identifier='start' pinColor={colors.red} />
						<Polyline
							coordinates={selectionCoords}
							strokeColor="#000" // fallback for when `strokeColors` is not supported by the map-provider
							strokeColors={['#00007F']}
							strokeWidth={4}
						/>
						<Marker coordinate={selectionCoords[selectionCoords.length - 1]} identifier='end' pinColor={colors.violet.primary} />
					</>)}
				</MapView>
				{loadingCoords && (<View style={styles.loading}>
					<ActivityIndicator size='large' />
				</View>)}
			</View>
			<FlatList
				style={styles.flatList}
				data={trips}
				keyExtractor={reportKeyExtractor}
				renderItem={tripItemRenderer}
				ListEmptyComponent={EmptyListComponent}
				ListFooterComponent={FooterListComponent}
				onEndReachedThreshold={1}
				onEndReached={onEndReached}
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
			{displayPicker && <MonthPicker
				onChange={onMonthPickerChange}
				value={currentDate.firstDay}
				maximumDate={new Date()}
				autoTheme={true}
			/>}
			<Modal animationType="fade" transparent={true} visible={downloading} statusBarTranslucent={true}>
				<View style={styles.overlay}>
					<View style={styles.overlayInner}>
						<ActivityIndicator size="large" />
						<Text style={styles.overlayText}>Generování reportu...</Text>
					</View>
				</View>
			</Modal>
		</View>
	)
}