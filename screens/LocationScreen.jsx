import MapView from 'react-native-maps';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { ActionSheetIOS, Dimensions, StyleSheet, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons/faLayerGroup';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons/faLocationArrow';
import { faExpand } from '@fortawesome/free-solid-svg-icons/faExpand';
import { useDevicesContext } from '../lib/context/devicesContext';
import { useAuthContext } from '../lib/context/authContext';
import { useStorage } from '../lib/storage';
import { debug } from '../lib/logger';
import DeviceMarker from './components/DeviceMarker';
import VehicleCard from './components/VehicleCard';
import { CONTROL_SIZE, ControlStack, FleetSummary } from './components/MapControls';

const MODULE = 'LocationScreen';
const LATITUDE_DELTA = 0.0922;
const FOLLOW_DELTA = 0.015;
const MARGIN = 12;

const MAP_TYPES = [
	['standard', 'Standardní'],
	['mutedStandard', 'Tlumená'],
	['hybrid', 'Satelitní'],
];

export default function LocationScreen({ navigation }) {
	const { devices, currentDevice, pinnedDevice, setCurrentDevice, setPinnedDevice } = useDevicesContext();
	const { online } = useAuthContext();
	const insets = useSafeAreaInsets();
	const mapViewRef = useRef();
	const markerIdsRef = useRef([]);
	const userLocationRef = useRef();
	const [cardOpen, setCardOpen] = useState(false);
	const [cardHeight, setCardHeight] = useState(0);
	const [mapType, setMapType] = useStorage('mapType', 'standard');
	const [showsTraffic, setShowsTraffic] = useStorage('showsTraffic', true);

	markerIdsRef.current = devices.map((d) => d.identifier);
	const movingCount = useMemo(() => devices.filter((d) => d.moving).length, [devices]);
	const cardDevice = cardOpen ? currentDevice : undefined;
	const following = !!pinnedDevice && pinnedDevice.id === cardDevice?.id;

	// keeps the map's center, legal label and compass clear of the floating UI
	const mapPadding = useMemo(() => ({
		top: insets.top + CONTROL_SIZE + MARGIN,
		right: 0,
		bottom: cardDevice ? cardHeight + MARGIN : 0,
		left: 0,
	}), [insets.top, cardDevice, cardHeight]);

	const fitToAllMarkers = useCallback(() => {
		const ids = markerIdsRef.current;
		debug(MODULE, 'fitToAllMarkers', ids);
		setPinnedDevice(null);
		if (ids.length) {
			mapViewRef.current?.fitToSuppliedMarkers(ids, {
				edgePadding: { top: 60, right: 70, bottom: 60, left: 50 },
				animated: true,
			});
		}
	}, [setPinnedDevice]);

	const showUserLocation = useCallback(() => {
		const location = userLocationRef.current;
		if (!location) return;
		setPinnedDevice(null);
		mapViewRef.current?.animateToRegion({
			latitude: location.latitude,
			longitude: location.longitude,
			latitudeDelta: FOLLOW_DELTA,
			longitudeDelta: FOLLOW_DELTA,
		});
	}, [setPinnedDevice]);

	const showMapOptions = useCallback(() => {
		const options = [
			...MAP_TYPES.map(([type, label]) => (type === mapType ? `✓ ${label}` : label)),
			showsTraffic ? 'Skrýt dopravu' : 'Zobrazit dopravu',
			'Zrušit',
		];
		ActionSheetIOS.showActionSheetWithOptions(
			{ title: 'Mapa', options, cancelButtonIndex: options.length - 1 },
			(index) => {
				if (index < MAP_TYPES.length) {
					setMapType(MAP_TYPES[index][0]);
				} else if (index === MAP_TYPES.length) {
					setShowsTraffic(!showsTraffic);
				}
			}
		);
	}, [mapType, showsTraffic, setMapType, setShowsTraffic]);

	const controls = useMemo(() => [
		{ icon: faLayerGroup, onPress: showMapOptions, label: 'Typ mapy' },
		{ icon: faLocationArrow, onPress: showUserLocation, label: 'Moje poloha' },
		{ icon: faExpand, onPress: fitToAllMarkers, label: 'Zobrazit všechna vozidla' },
	], [showMapOptions, showUserLocation, fitToAllMarkers]);

	// tapping a vehicle selects it for reports, follows it and shows its card
	const onMarkerPress = useCallback((device) => {
		setCurrentDevice(device);
		setPinnedDevice(device);
		setCardOpen(true);
	}, [setCurrentDevice, setPinnedDevice]);

	// vehicles picked in the drawer get a card too
	const pinnedId = pinnedDevice?.id;
	useEffect(() => {
		if (pinnedId != null) setCardOpen(true);
	}, [pinnedId]);

	const closeCard = useCallback(() => {
		setCardOpen(false);
		setPinnedDevice(null);
	}, [setPinnedDevice]);

	const toggleFollow = useCallback(() => {
		setPinnedDevice(following ? null : cardDevice);
	}, [following, cardDevice, setPinnedDevice]);

	const openDrawer = useCallback(() => navigation.dispatch(DrawerActions.openDrawer()), [navigation]);
	const openTrips = useCallback(() => navigation.navigate('Trasy'), [navigation]);
	const openDetail = useCallback(() => {
		cardDevice && navigation.navigate('DeviceInfoScreen', { deviceId: cardDevice.id });
	}, [navigation, cardDevice]);
	const onCardLayout = useCallback((e) => setCardHeight(Math.round(e.nativeEvent.layout.height)), []);

	// Follow pinned device as its position changes
	const pinnedLatitude = pinnedDevice?.position?.latitude;
	const pinnedLongitude = pinnedDevice?.position?.longitude;
	useEffect(() => {
		if (pinnedLatitude == null || pinnedLongitude == null) return;
		mapViewRef.current?.animateToRegion({
			latitude: pinnedLatitude,
			longitude: pinnedLongitude,
			latitudeDelta: FOLLOW_DELTA,
			longitudeDelta: FOLLOW_DELTA,
		});
	}, [pinnedLatitude, pinnedLongitude]);

	// Fit to all markers once devices first load
	const hasInitialFitRef = useRef(false);
	useEffect(() => {
		if (hasInitialFitRef.current || !devices.length) return;
		hasInitialFitRef.current = true;
		const timer = setTimeout(fitToAllMarkers, 300);
		return () => clearTimeout(timer);
	}, [devices.length, fitToAllMarkers]);

	const resetPinnedDevice = useCallback(() => {
		setPinnedDevice(null);
	}, [setPinnedDevice]);

	const onUserLocationChange = useCallback((e) => {
		userLocationRef.current = e.nativeEvent.coordinate;
	}, []);

	const initialRegion = useMemo(() => {
		const { width, height } = Dimensions.get('window');
		return {
			latitude: 49.5783732,
			longitude: 14.1036266,
			latitudeDelta: LATITUDE_DELTA,
			longitudeDelta: LATITUDE_DELTA * (width / height),
		};
	}, []);

	return (
		<View style={styles.container}>
			<MapView
				ref={mapViewRef}
				style={styles.map}
				initialRegion={initialRegion}
				mapType={mapType}
				mapPadding={mapPadding}
				// below the control stack, which sits in the top padding
				compassOffset={{ x: 0, y: 3 * CONTROL_SIZE }}
				showsUserLocation
				showsTraffic={showsTraffic}
				showsCompass
				zoomEnabled
				onPanDrag={resetPinnedDevice}
				onUserLocationChange={onUserLocationChange}
			>
				{devices.map((device) => (
					<DeviceMarker
						key={device.id}
						device={device}
						selected={device.id === cardDevice?.id}
						onPress={onMarkerPress}
					/>
				))}
			</MapView>

			<View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
				<FleetSummary count={devices.length} moving={movingCount} online={online} onPress={openDrawer} />
				<ControlStack buttons={controls} />
			</View>

			{cardDevice && (
				<View style={styles.bottom} pointerEvents="box-none">
					<VehicleCard
						device={cardDevice}
						following={following}
						onFollow={toggleFollow}
						onTrips={openTrips}
						onDetail={openDetail}
						onClose={closeCard}
						onLayout={onCardLayout}
					/>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	map: {
		...StyleSheet.absoluteFillObject,
	},
	top: {
		position: 'absolute',
		left: MARGIN,
		right: MARGIN,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	bottom: {
		position: 'absolute',
		left: MARGIN,
		right: MARGIN,
		bottom: MARGIN,
	},
});
