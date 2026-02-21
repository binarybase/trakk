import MapView from 'react-native-maps';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useStyles } from '../style/useStyles';
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
const HEADER_TITLE = 'Trakk';

export default () => {
	const { loggedIn } = useAuthContext();
	const { setHeaderTitle, setHeaderRight } = useAppContext();
	const { devices, currentDevice, setPinnedDevice, pinnedDevice } = useDevicesContext();
	const mapViewRef = useRef();
	const markerIdsRef = useRef([]);
	const { width, height } = Dimensions.get('window');
	const LATITUDE_DELTA = 0.0922;
	const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
	const [styles] = useStyles({
		map: { flex: 1 },
		rightHeaderButton: { marginRight: 15, padding: 5 },
	});

	const fitToAllMarkers = useCallback(() => {
		const ids = markerIdsRef.current;
		debug(MODULE, 'fitToAllMarkers', ids);
		if (!ids.length) return;
		mapViewRef.current?.fitToSuppliedMarkers(ids);
		setPinnedDevice(null);
	}, [setPinnedDevice]);

	const RightIconComponent = useCallback(
		() => (
			<TouchableOpacity style={styles.rightHeaderButton} onPress={fitToAllMarkers}>
				<FontAwesomeIcon icon={faStreetView} size={20} color={styles.colors.blue.primary} />
			</TouchableOpacity>
		),
		[fitToAllMarkers, styles]
	);

	const setDefaultHeader = useCallback(() => {
		setHeaderTitle(HEADER_TITLE);
		setHeaderRight(() => RightIconComponent);
	}, [setHeaderTitle, setHeaderRight, RightIconComponent]);

	// Update header when tab changes
	useFocusedTabEffect(
		(isFocused) => {
			if (isFocused) setDefaultHeader();
		},
		[setDefaultHeader]
	);

	// Set default header on mount
	useEffect(() => {
		setDefaultHeader();
	}, [setDefaultHeader]);

	// Pan to device when currentDevice changes
	useEffect(() => {
		if (!currentDevice?.position) return;
		debug(MODULE, 'animateToRegion for device change');
		mapViewRef.current?.animateToRegion({
			latitude: currentDevice.position.latitude,
			longitude: currentDevice.position.longitude,
			latitudeDelta: 0.1,
			longitudeDelta: 0.1,
		});
	}, [currentDevice]);

	// Follow pinned device as positions stream in via WebSocket
	useEffect(() => {
		if (!pinnedDevice) return;
		const position = devices.find((d) => d.id === pinnedDevice.id)?.position;
		if (position) {
			mapViewRef.current?.animateToRegion({
				latitude: position.latitude,
				longitude: position.longitude,
				latitudeDelta: 0.015,
				longitudeDelta: 0.015,
			});
		}
	}, [devices, pinnedDevice]);

	// Update marker IDs cache whenever devices change
	useEffect(() => {
		if (!loggedIn) return;
		const ids = devices.map((d) => d.identifier);
		markerIdsRef.current = ids;
	}, [devices, loggedIn]);

	// Fit to all markers once devices first load
	const hasInitialFitRef = useRef(false);
	useEffect(() => {
		if (hasInitialFitRef.current || !devices.length || !loggedIn) return;
		const ids = devices.map((d) => d.identifier);
		if (ids.length) {
			setTimeout(() => mapViewRef.current?.fitToSuppliedMarkers(ids), 300);
			hasInitialFitRef.current = true;
		}
	}, [devices, loggedIn]);

	const resetPinnedDevice = useCallback(() => {
		setPinnedDevice(null);
	}, [setPinnedDevice]);

	const initialRegion = useMemo(
		() => ({
			latitude: 49.5783732,
			longitude: 14.1036266,
			latitudeDelta: LATITUDE_DELTA,
			longitudeDelta: LONGITUDE_DELTA,
		}),
		[LATITUDE_DELTA, LONGITUDE_DELTA]
	);

	return (
		<MapView
			ref={mapViewRef}
			style={styles.map}
			initialRegion={initialRegion}
			showsUserLocation={true}
			showsMyLocationButton={true}
			showsTraffic={true}
			zoomEnabled={true}
			onPanDrag={resetPinnedDevice}
		>
			{devices?.map((device) => (
				<DeviceMarker device={device} key={device.id} />
			))}
		</MapView>
	);
};