import { TouchableOpacity, View, Text } from "react-native";
import { memo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import ReportView, { END_COLOR, START_COLOR } from "./components/ReportView";
import AddressLine from "./components/AddressLine";
import { formatDistance } from '../lib/formatter';
import { durationBetweenDates, formatDuration, formatShortDate, formatShortTime } from "../lib/date";

const TripItem = memo(({ item, selected, onSelect, onInfo, styles }) => (
	<TouchableOpacity
		onPress={() => onSelect(item)}
		onLongPress={() => onInfo(item)}
		style={[styles.listItem, selected && styles.listItemSelected]}
	>
		<View style={styles.rowMain}>
			<Text style={styles.rowTitle}>
				{formatShortDate(item.startTime)} · {formatShortTime(item.startTime)} – {formatShortTime(item.endTime)}
			</Text>
			<AddressLine color={START_COLOR} text={item.startAddress} styles={styles} />
			<AddressLine color={END_COLOR} text={item.endAddress} styles={styles} />
		</View>
		<View style={styles.rowAside}>
			<Text style={styles.rowValue}>{formatDistance(item.distance)}</Text>
			<Text style={styles.rowMeta}>{formatDuration(durationBetweenDates(item.endTime, item.startTime))}</Text>
			<TouchableOpacity
				style={styles.rowButton}
				onPress={() => onInfo(item)}
				hitSlop={10}
				accessibilityRole="button"
				accessibilityLabel="Detail trasy"
			>
				<FontAwesomeIcon icon={faCircleInfo} size={16} color={styles.colors.blue.primary} />
			</TouchableOpacity>
		</View>
	</TouchableOpacity>
));

export default function TripsScreen({ navigation }) {
	const renderItem = useCallback(({ item, styles, selection, setSelection }) => (
		<TripItem
			item={item}
			styles={styles}
			selected={selection?.startTime === item.startTime}
			onSelect={setSelection}
			onInfo={(trip) => navigation.navigate('TripInfoScreen', { trip })}
		/>
	), [navigation]);

	return (
		<ReportView
			reportType="cachedTrips.php"
			downloadReportType="trips"
			reportTitle="Trasy"
			renderItem={renderItem}
		/>
	);
}
