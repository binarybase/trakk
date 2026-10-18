import MapView, { Polyline, Marker } from 'react-native-maps';
import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigation } from '@react-navigation/native';
import { colors, useStyles } from "../../style/useStyles";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useDevicesContext } from '../../lib/context/devicesContext';
import { download, EXCEL_TYPE, get } from '../../lib/request';
import { formatDate, formatMonth } from '../../lib/date';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { getRegionForCoordinates } from '../../lib/maputil';
import DeviceMarker from './DeviceMarker';
import { HeaderButton, HeaderButtons } from './HeaderButton';
import { faCalendar } from '@fortawesome/free-regular-svg-icons/faCalendar';
import { faFileArrowDown } from '@fortawesome/free-solid-svg-icons/faFileArrowDown';
import MonthPicker, { ACTION_DATE_SET } from 'react-native-month-year-picker';
import Share from 'react-native-share';
import { alert } from '../../lib/alert';
import { debug, error as logError } from '../../lib/logger';
import { useReportData } from '../../lib/hooks/useReportData';

const MODULE = 'ReportView';
const keyExtractor = t => t?.startTime;
const DEVICE_DELTA = 0.01;
const POINT_DELTA = 0.05;

export const START_COLOR = colors.red;
export const END_COLOR = colors.violet.primary;

const regionAround = (position, delta) => position?.latitude != null ? {
	latitude: position.latitude,
	longitude: position.longitude,
	latitudeDelta: delta,
	longitudeDelta: delta,
} : undefined;

/**
 * map with a month of report items of the current device
 *
 * @param {Function} props.renderItem - ({ item, styles, selection, setSelection, selectionPoint, panToPointMarker }) => element
 */
export default function ReportView({
	downloadReportType,
	reportType = "trips",
	reportTitle = "Trasy",
	renderItem,
	reportKeyExtractor = keyExtractor
}) {
	const navigation = useNavigation();
	const { devices, currentDevice, setCurrentDevice } = useDevicesContext();
	const deviceId = currentDevice?.id;
	const deviceName = currentDevice?.name;
	const mapViewRef = useRef();
	const positionRef = useRef();
	positionRef.current = currentDevice?.position;

	const [styles] = useStyles(s => ({
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
		emptyText: {
			...s.text.note,
			textAlign: 'center',
		},
		errorText: {
			...s.text.note,
			textAlign: 'center',
			color: s.colors.red,
		},
		linkText: {
			...s.text.base,
			color: s.colors.blue.primary,
			fontWeight: '500',
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
		},
		monthBar: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingTop: 14,
			paddingBottom: 8,
		},
		monthText: {
			...s.text.subtitle,
			color: s.fg,
			marginLeft: 8,
		},
		// list rows, shared by the report screens
		listItem: {
			flexDirection: 'row',
			borderBottomColor: s.separator,
			borderBottomWidth: 0.5,
			paddingVertical: 12,
			paddingHorizontal: 16,
		},
		listItemSelected: {
			backgroundColor: s.colors.blue.secondary,
		},
		rowMain: {
			flex: 1,
			marginRight: 12,
		},
		rowAside: {
			alignItems: 'flex-end',
		},
		rowTitle: {
			fontSize: 15,
			fontWeight: '600',
			color: s.fg,
			marginBottom: 4,
		},
		rowValue: {
			fontSize: 15,
			fontWeight: '600',
			color: s.fg,
			marginBottom: 4,
		},
		rowMeta: {
			fontSize: 13,
			color: s.muted,
		},
		addressRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 3,
		},
		dot: {
			width: 8,
			height: 8,
			borderRadius: 4,
			marginRight: 8,
		},
		addressText: {
			fontSize: 13,
			color: s.muted,
			flex: 1,
		},
		rowButton: {
			marginTop: 8,
			padding: 2,
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
		setMonth,
		reload,
	} = useReportData({
		deviceId,
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
	const [initialRegion] = useState(() => regionAround(positionRef.current, DEVICE_DELTA));

	// reports need a device, default to the first one
	useEffect(() => {
		if (!currentDevice && devices.length) {
			setCurrentDevice(devices[0]);
		}
	}, [currentDevice, devices, setCurrentDevice]);

	// a different device or month invalidates the selection
	useEffect(() => {
		setSelection(undefined);
		setSelectionPoint(undefined);
		setSelectionCoords([]);
	}, [deviceId, currentDate]);

	// center on the newly selected device
	useEffect(() => {
		if (!deviceId) return;
		debug(MODULE, 'device changed', deviceId);
		const region = regionAround(positionRef.current, DEVICE_DELTA);
		region && mapViewRef.current?.animateToRegion(region);
	}, [deviceId]);

	/**
	 * Downloads Excel report and opens share dialog.
	 */
	const downloadReport = useCallback(async () => {
		if (!deviceId) return;

		const params = new URLSearchParams({
			deviceId,
			from: currentDate.firstDayOfMonth.toISOString(),
			to: currentDate.lastDayOfMonth.toISOString(),
		});

		setDownloading(true);
		try {
			const response = await download(
				`reports/${downloadReportType || reportType}?${params.toString()}`,
				`${reportTitle}_${deviceName}`
			);
			if (!response?.path) {
				alert('Stažení selhalo - soubor neobsahuje žádná data');
				return;
			}

			const { path, unlink } = response;
			// give the progress modal time to close before the share sheet opens
			setTimeout(() => {
				Share.open({
					type: EXCEL_TYPE,
					message: `${reportTitle} - ${deviceName}`,
					url: path,
					failOnCancel: false,
				}).then(unlink);
			}, 500);
		} catch (ex) {
			logError(MODULE, 'downloadReport failed', ex);
			alert('Stažení selhalo');
		} finally {
			setDownloading(false);
		}
	}, [deviceId, deviceName, currentDate, reportType, downloadReportType, reportTitle]);

	const showPicker = useCallback(() => setDisplayPicker(true), []);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: deviceName ? `${reportTitle} – ${deviceName}` : reportTitle,
			headerRight: () => (
				<HeaderButtons>
					<HeaderButton icon={faCalendar} onPress={showPicker} accessibilityLabel="Vybrat měsíc" />
					<HeaderButton icon={faFileArrowDown} onPress={downloadReport} accessibilityLabel="Exportovat do Excelu" />
				</HeaderButtons>
			),
		});
	}, [navigation, reportTitle, deviceName, showPicker, downloadReport]);

	/**
	 * Pan map to a point marker coordinate.
	 */
	const panToPointMarker = useCallback((coords) => {
		if (!coords) return;
		setSelectionPoint(coords);
		mapViewRef.current?.animateToRegion(regionAround(coords, POINT_DELTA));
	}, []);

	/**
	 * Month picker change handler.
	 */
	const onMonthPickerChange = useCallback((e, date) => {
		setDisplayPicker(false);
		if (e !== ACTION_DATE_SET) return;
		setMonth(date);
	}, [setMonth]);

	// --- Load route polyline when selection changes ---
	useEffect(() => {
		if (!selection?.startTime || !selection?.endTime || !deviceId) return;

		let cancelled = false;
		const params = new URLSearchParams({
			deviceId,
			from: new Date(selection.startTime).toISOString(),
			to: new Date(selection.endTime).toISOString(),
		});

		setLoadingCoords(true);
		get(`reports/route?${params.toString()}`)
			.then(response => {
				if (cancelled) return;
				const coords = Array.isArray(response.data) ? response.data : [];
				setSelectionCoords(coords);
				if (coords.length >= 2) {
					mapViewRef.current?.animateToRegion(getRegionForCoordinates(coords));
				}
			})
			.finally(() => !cancelled && setLoadingCoords(false));

		return () => {
			cancelled = true;
			setLoadingCoords(false);
		};
	}, [selection, deviceId]);

	// --- List parts ---
	const ListHeaderComponent = useMemo(() => (
		<TouchableOpacity style={styles.monthBar} onPress={showPicker} accessibilityRole="button" accessibilityLabel="Vybrat měsíc">
			<FontAwesomeIcon icon={faCalendar} size={15} color={styles.colors.blue.primary} />
			<Text style={styles.monthText}>{formatMonth(currentDate.firstDay)}</Text>
		</TouchableOpacity>
	), [styles, currentDate, showPicker]);

	const ListFooterComponent = useMemo(() => loadingMore && (
		<View style={styles.empty}>
			<ActivityIndicator size="small" />
		</View>
	), [styles, loadingMore]);

	const ListEmptyComponent = useMemo(() => {
		if (loading) {
			return (
				<View style={styles.empty}>
					<ActivityIndicator size="large" />
				</View>
			);
		}

		if (error) {
			return (
				<View style={styles.empty}>
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity onPress={reload} accessibilityRole="button">
						<Text style={styles.linkText}>Zkusit znovu</Text>
					</TouchableOpacity>
				</View>
			);
		}

		// lastDayOfMonth is exclusive
		const lastDay = new Date(+currentDate.lastDayOfMonth - 1);
		return (
			<View style={styles.empty}>
				<Text style={styles.emptyText}>
					{deviceId
						? `Pro období od ${formatDate(currentDate.firstDayOfMonth)} do ${formatDate(lastDay)} nejsou k dispozici žádné záznamy`
						: 'Žádné vozidlo k zobrazení'}
				</Text>
			</View>
		);
	}, [styles, loading, error, reload, currentDate, deviceId]);

	const renderListItem = useCallback(({ item }) => renderItem({
		item,
		styles,
		selection,
		setSelection,
		selectionPoint,
		panToPointMarker,
	}), [renderItem, styles, selection, selectionPoint, panToPointMarker]);

	return (
		<View style={styles.container}>
			<View style={styles.mapContainer}>
				<MapView
					style={styles.map}
					ref={mapViewRef}
					initialRegion={initialRegion}
					showsUserLocation
					showsMyLocationButton
					showsTraffic
					zoomEnabled
				>
					{currentDevice?.position && (
						<DeviceMarker device={currentDevice} />
					)}
					{selectionPoint?.latitude != null && (
						<Marker coordinate={selectionPoint} identifier="point" pinColor={START_COLOR} />
					)}
					{selectionCoords.length >= 2 && (<>
						<Marker coordinate={selectionCoords[0]} identifier="start" pinColor={START_COLOR} />
						<Polyline
							coordinates={selectionCoords}
							strokeColor={colors.blue.primary}
							strokeWidth={4}
						/>
						<Marker coordinate={selectionCoords[selectionCoords.length - 1]} identifier="end" pinColor={END_COLOR} />
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
				renderItem={renderListItem}
				ListHeaderComponent={ListHeaderComponent}
				ListEmptyComponent={ListEmptyComponent}
				ListFooterComponent={ListFooterComponent}
				refreshing={refreshing}
				onRefresh={deviceId ? onRefresh : undefined}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.5}
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
}
