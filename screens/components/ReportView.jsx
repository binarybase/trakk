import MapView, { Polyline, Marker } from 'react-native-maps';
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { colors, useStyles } from "../../style/useStyles";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { isDeviceMoving, useDevicesContext } from '../../lib/context/devicesContext';
import { download, EXCEL_TYPE, get } from '../../lib/request';
import { formatDate } from '../../lib/date';
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
import { debug } from '../../lib/logger';
import { useReportData } from '../../lib/hooks/useReportData';

const MODULE = 'ReportView';
const keyExtractor = t => t?.startTime;

export default ReportView = ({
	downloadReportType,
	reportType = "trips",
	reportTitle = "Trasy",
	reportItemRenderer,
	reportKeyExtractor = keyExtractor
}) => {
	const { setHeaderTitle, setHeaderRight } = useAppContext();
	const { devices, currentDevice, setCurrentDevice } = useDevicesContext();
	const mapViewRef = useRef();

	const [styles, theme] = useStyles(s => ({
		container: {
			flex: 1,
			backgroundColor: s.bg,
		},
		mapContainer: {
			flex: 0.65,
			borderBottomLeftRadius: 16,
			borderBottomRightRadius: 16,
			overflow: 'hidden',
		},
		map: {
			flex: 1,
		},
		flatList: {
			flex: 1,
		},
		empty: {
			flex: 1,
			paddingVertical: 32,
			paddingHorizontal: 16,
			alignItems: 'center',
			justifyContent: 'center',
		},
		loading: {
			position: 'absolute',
			top: 0,
			left: 0,
			backgroundColor: 'rgba(0,0,0,0.4)',
			width: '100%',
			height: '100%',
			justifyContent: 'center',
			alignItems: 'center',
			borderBottomLeftRadius: 16,
			borderBottomRightRadius: 16,
		},
		rightHeaderButton: {
			marginRight: 8,
			padding: 8,
		},
		listItem: {
			flexDirection: 'row',
			borderBottomColor: s.separator,
			borderBottomWidth: 0.5,
			paddingVertical: 10,
			paddingHorizontal: 12,
		},
		listItemSelected: {
			backgroundColor: s.colors.blue.secondary,
		},
		refreshText: {
			...s.text.base,
			alignSelf: 'center',
		},
		loadMoreLinkText: {
			...s.text.base,
			alignSelf: 'center',
			color: s.colors.blue.primary,
		},
		overlay: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: 'rgba(0,0,0,0.5)',
		},
		overlayInner: {
			borderRadius: 16,
			backgroundColor: s.cardBg,
			justifyContent: 'center',
			alignItems: 'center',
			alignSelf: 'center',
			flexDirection: 'column',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 12,
			elevation: 8,
			width: 220,
			paddingVertical: 28,
			paddingHorizontal: 20,
		},
		overlayText: {
			marginTop: 16,
			textAlign: 'center',
			fontSize: 15,
			fontWeight: '500',
			color: s.fg,
		},
	}));

	// --- Report data hook ---
	const {
		items,
		loading,
		loadingMore,
		refreshing,
		error,
		currentDate,
		onRefresh,
		onEndReached,
		loadInitial,
		setMonth,
		reset,
	} = useReportData({
		currentDevice,
		reportType,
		keyExtractorFn: reportKeyExtractor,
	});

	// --- Local UI state ---
	const [selection, setSelection] = useState();
	const [selectionCoords, setSelectionCoords] = useState([]);
	const [selectionPoint, setSelectionPoint] = useState();
	const [loadingCoords, setLoadingCoords] = useState(false);
	const [displayPicker, setDisplayPicker] = useState(false);
	const [downloading, setDownloading] = useState(false);

	const currentDevicePosition = useMemo(
		() => devices?.find(d => d.id === currentDevice?.id)?.position || currentDevice?.position || {},
		[currentDevice, devices]
	);

	/**
	 * Downloads Excel report and opens share dialog.
	 */
	const downloadReport = useCallback(async () => {
		const reportFile = `${reportTitle}_${currentDevice.name}`;
		const params = new URLSearchParams({
			deviceId: currentDevice.id,
			from: currentDate.firstDayOfMonth.toISOString(),
			to: currentDate.lastDayOfMonth.toISOString(),
		});

		setDownloading(true);
		try {
			const response = await download(
				`reports/${downloadReportType || reportType}?${params.toString()}`,
				reportFile
			);
			if (!response?.path) {
				alert('Stažení selhalo - soubor neobsahuje žádná data');
				return;
			}

			const { path, unlink } = response;
			const options = {
				type: EXCEL_TYPE,
				message: `${reportType} - ${currentDevice.name}`,
				url: path,
				failOnCancel: false,
			};

			setTimeout(() => {
				Share.open(options).then(unlink);
			}, 500);
		} catch (ex) {
			console.error('downloadReport failed', ex);
			alert('Stažení selhalo');
		} finally {
			setDownloading(false);
		}
	}, [currentDevice, currentDate, reportType, downloadReportType, reportTitle]);

	/**
	 * Pan map to a point marker coordinate.
	 */
	const panToPointMarker = useCallback((coords) => {
		if (!coords) return;
		setSelectionPoint(coords);
		mapViewRef.current?.animateToRegion({
			...coords,
			latitudeDelta: 0.05,
			longitudeDelta: 0.05,
		});
	}, []);

	/**
	 * Month picker change handler.
	 */
	const onMonthPickerChange = useCallback((e, date) => {
		setDisplayPicker(false);
		if (e !== ACTION_DATE_SET) return;
		setMonth(date);
	}, [setMonth]);

	// --- Device change: reset selections and load data ---
	useEffect(() => {
		setSelectionPoint({});
		setSelectionCoords([]);

		if (currentDevice === undefined && devices.length) {
			setCurrentDevice(devices[0]);
			return;
		}

		if (!currentDevice || !currentDate) return;
		debug(MODULE, 'Device changed:', currentDevice.id);

		loadInitial();

		if (currentDevice && currentDevicePosition?.latitude) {
			mapViewRef.current?.animateToRegion({
				latitude: currentDevicePosition.latitude,
				longitude: currentDevicePosition.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			});
		}

		return () => reset();
	}, [currentDevice, currentDate]);

	// --- Header updates on tab focus ---
	useFocusedTabEffect(isFocused => {
		if (!isFocused) return;
		setHeaderTitle(`${reportTitle} - ${currentDevice?.name}`);
		setHeaderRight(() => () => <RightIconComponent />);
	}, [currentDevice, currentDevicePosition]);

	// --- Load route polyline when selection changes ---
	useEffect(() => {
		if (!selection?.startTime || !selection?.endTime) return;

		setLoadingCoords(true);
		const from = new Date(selection.startTime)?.toISOString();
		const to = new Date(selection.endTime)?.toISOString();
		if (!from || !to) return;

		const params = new URLSearchParams({
			deviceId: currentDevice.id,
			from,
			to,
		});

		get(`reports/route?${params.toString()}`)
			.then(response => {
				setSelectionCoords(response.data);

				if (!response.data || response.data.length < 2) return;
				const startCoord = response.data[0];
				const endCoord = response.data[response.data.length - 1];
				if (!startCoord || !endCoord) return;

				mapViewRef.current?.animateToRegion(getRegionForCoordinates([startCoord, endCoord]));
			})
			.catch(() => {})
			.finally(() => setLoadingCoords(false));
	}, [selection]);

	// --- Sub-components ---
	const RightIconComponent = useCallback(() => (
		<View style={{ flexDirection: 'row' }}>
			<TouchableOpacity style={styles.rightHeaderButton} onPress={() => setDisplayPicker(true)}>
				<FontAwesomeIcon icon={faCalendar} size={20} color={styles.colors.blue.primary} />
			</TouchableOpacity>
			<TouchableOpacity style={styles.rightHeaderButton} onPress={downloadReport}>
				<FontAwesomeIcon icon={faFileArrowDown} size={20} color={styles.colors.blue.primary} />
			</TouchableOpacity>
		</View>
	), [theme, downloadReport]);

	const FooterListComponent = useMemo(() => loadingMore && (
		<View style={styles.empty}>
			<ActivityIndicator size="small" />
			<Text style={[styles.text.base, { paddingLeft: 10, marginTop: 8 }]}>Načítání dalších záznamů...</Text>
		</View>
	), [loadingMore]);

	const EmptyListComponent = useMemo(() => !loadingMore && !loading && (
		<View style={styles.empty}>
			<Text style={[styles.text.note, styles.text.center]}>
				Pro období od {formatDate(currentDate.firstDayOfMonth)} do {formatDate(currentDate.lastDayOfMonth)} nejsou k dispozici žádné záznamy
			</Text>
		</View>
	), [currentDate, loadingMore, loading]);

	const tripItemRenderer = useCallback(({ item }) => reportItemRenderer({
		item,
		setSelection,
		selection,
		currentDevice,
		styles,
		selectionPoint,
		setSelectionPoint,
		panToPointMarker,
	}), [currentDevice, theme, selection, selectionPoint]);

	if (loading || error) {
		return <LoadingView error={error} />;
	}

	return (
		<View style={styles.container}>
			<View style={styles.mapContainer}>
				<MapView
					style={styles.map}
					ref={mapViewRef}
					showsUserLocation
					showsMyLocationButton
					showsTraffic
					zoomEnabled
				>
					{currentDevice && currentDevicePosition?.latitude && (
						<DeviceMarker device={{
							...currentDevice,
							position: currentDevicePosition,
							moving: isDeviceMoving({
								...currentDevice,
								position: currentDevicePosition,
							}),
						}} />
					)}
					{selectionPoint?.latitude && (
						<Marker coordinate={selectionPoint} identifier="point" pinColor={colors.red} />
					)}
					{selectionCoords?.length >= 2 && (<>
						<Marker coordinate={selectionCoords[0]} identifier="start" pinColor={colors.red} />
						<Polyline
							coordinates={selectionCoords}
							strokeColor="#1a1a2e"
							strokeColors={['#007aff']}
							strokeWidth={4}
						/>
						<Marker coordinate={selectionCoords[selectionCoords.length - 1]} identifier="end" pinColor={colors.violet.primary} />
					</>)}
				</MapView>
				{loadingCoords && (
					<View style={styles.loading}>
						<ActivityIndicator size="large" color="#fff" />
					</View>
				)}
			</View>

			<FlatList
				style={styles.flatList}
				data={items}
				keyExtractor={reportKeyExtractor}
				renderItem={tripItemRenderer}
				ListEmptyComponent={EmptyListComponent}
				ListFooterComponent={FooterListComponent}
				refreshing={refreshing}
				onRefresh={onRefresh}
				onEndReached={onEndReached}
			/>

			{displayPicker && (
				<MonthPicker
					onChange={onMonthPickerChange}
					value={currentDate.firstDay}
					maximumDate={new Date()}
					autoTheme
				/>
			)}

			<Modal animationType="fade" transparent visible={downloading} statusBarTranslucent>
				<View style={styles.overlay}>
					<View style={styles.overlayInner}>
						<ActivityIndicator size="large" />
						<Text style={styles.overlayText}>Generování reportu...</Text>
					</View>
				</View>
			</Modal>
		</View>
	);
};
