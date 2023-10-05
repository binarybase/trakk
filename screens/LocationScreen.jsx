import MapView from 'react-native-maps';
import { useCallback, useEffect, useRef, useState } from "react";
import { useStyles } from "../style/useStyles";
import { Dimensions, TouchableOpacity } from 'react-native';
import { useDevicesContext } from '../lib/context/devicesContext';
import { useAppContext } from '../lib/context/appContext';
import DeviceMarker from './components/DeviceMarker';
import { useFocusedTabEffect } from '../lib/hooks/useFocusedTab';
import { useAuthContext } from '../lib/context/authContext';
import { faStreetView } from '@fortawesome/free-solid-svg-icons/faStreetView';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { debug } from '../lib/logger';

const MODULE = 'LocationScreen';
const HEADER_TITLE = "Trakk";
let watchId;
let markerIdCache = [];
const clearWatchId = () => {
	watchId && clearInterval(watchId);
	watchId = null;
}

export default () => {
	const { loggedIn } = useAuthContext();
	const { setHeaderTitle, setHeaderRight } = useAppContext();
	const { isTestEnabled, devices, update, currentDevice, setPinnedDevice, pinnedDevice } = useDevicesContext();
	//const [ lastPosition, setLastPosition ] = useStorage('mapPosition', null);
	const mapViewRef = useRef();
	const { width, height } = Dimensions.get('window');
	const LATITUDE_DELTA = 0.0922;
	const LONGITUDE_DELTA = LATITUDE_DELTA * width / height;
	const [ styles, theme ]= useStyles({
		map: {
			flex: 1
		},
		rightHeaderButton: {
			marginRight: 15,
			padding: 5
		}
	});

	const RightIconComponent = useCallback(() => (
		<TouchableOpacity style={styles.rightHeaderButton} onPress={fitToAllMarkers}>
			<FontAwesomeIcon icon={faStreetView} size={20} color={styles.colors.blue.primary} />
		</TouchableOpacity>
	), []);

	const setDefaultHeader = () => {
		setHeaderTitle(HEADER_TITLE);
		setHeaderRight(() => RightIconComponent);
	}

	const fitToAllMarkers = () => {
		debug(MODULE, 'fitToAllMarkers', markerIdCache);
		if(!markerIdCache.length)
			return;

		mapViewRef.current?.fitToSuppliedMarkers(markerIdCache);
		resetPinnedDevice();
	}

	// update header when tab changes
	useFocusedTabEffect(isFocused => {
		isFocused && setDefaultHeader();
	})
	// pan to device when changes
	useEffect(() => {
		if(!currentDevice || !currentDevice.position) return;
		//mapViewRef.current?.fitToSuppliedMarkers([ currentDevice?.identifier ])
		mapViewRef.current?.animateToRegion({
			latitude: currentDevice.position.latitude,
			longitude: currentDevice.position.longitude,
			latitudeDelta: 0.1,
			longitudeDelta: 0.1
		})
	}, [ currentDevice ]);

	/**
	 * creates devices watcher
	 */
	const watchDevices = () => {
		// clear on startup if called multiple times
		watchId && clearInterval(watchId);
		// load positions and fit to them
		debug(MODULE, 'starting watchDevices');
		update().then(devices => {
			// error
			if(devices === null){
				setHeaderTitle("Připojování...");
				return;
			}
			setDefaultHeader();

			if(!devices) return;

			const markerIds = devices.map(d => d.identifier);
			if(!markerIds.length)
				return;

			mapViewRef.current?.fitToSuppliedMarkers(markerIds);
			markerIdCache = markerIds;
		})

		// set watcher
		watchId = setInterval(update, 10000);
	}

	// update pinned device when positions changed
	useEffect(() => {
		if(pinnedDevice){
			// find pinned device position to refresh coordinates
			// actually pinned device contains old position object
			const position = devices.find(d => d.id === pinnedDevice.id)?.position;
			if(position){
				debug(MODULE, 'updatePositions: pan to', pinnedDevice?.identifier, position.latitude, position.longitude);
				mapViewRef.current?.animateToRegion({
					latitude: position.latitude,
					longitude: position.longitude,
					latitudeDelta: 0.015,
					longitudeDelta: 0.015
				})
			}
		}
	}, [ mapViewRef, devices, pinnedDevice ]);

	// run at startup
	useEffect(() => {
		// do not execute when logged out
		if(!loggedIn){
			clearWatchId();
			return;
		}

		watchDevices();

		// clear watchers on refresh
		return () => {
			clearWatchId();
		}
	}, [ loggedIn, isTestEnabled ]);

	const resetPinnedDevice = useCallback(() => {
		setPinnedDevice(null);
	}, [ ]);

	return (
		<MapView
			ref={mapViewRef}
			style={styles.map}
			initialRegion={{
				latitude: 48.565,
				longitude: 14.566,
				latitudeDelta: LATITUDE_DELTA,
				longitudeDelta: LONGITUDE_DELTA
			}}
			showsUserLocation={true}
			showsMyLocationButton={true}
			showsTraffic={true}
			zoomEnabled={true}
			onPanDrag={resetPinnedDevice}
		>
			{devices?.map(device => (<DeviceMarker device={device} key={device.id} />))}
		</MapView>
	)
}