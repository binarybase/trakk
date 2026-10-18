import { memo, useCallback } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import ReportView, { START_COLOR } from "./components/ReportView";
import AddressLine from "./components/AddressLine";
import { formatDuration, formatShortDate, formatShortTime } from "../lib/date";

const StopItem = memo(({ item, selected, onSelect, styles }) => (
	<TouchableOpacity
		onPress={() => onSelect(item)}
		style={[styles.listItem, selected && styles.listItemSelected]}
	>
		<View style={styles.rowMain}>
			<Text style={styles.rowTitle}>
				{formatShortDate(item.startTime)} · {formatShortTime(item.startTime)} – {formatShortTime(item.endTime)}
			</Text>
			<AddressLine color={START_COLOR} text={item.address} styles={styles} />
		</View>
		<View style={styles.rowAside}>
			<Text style={styles.rowValue}>{formatDuration(item.duration)}</Text>
		</View>
	</TouchableOpacity>
));

export default function StopsScreen() {
	const renderItem = useCallback(({ item, styles, selectionPoint, panToPointMarker }) => (
		<StopItem
			item={item}
			styles={styles}
			selected={selectionPoint?.startTime === item.startTime}
			onSelect={(stop) => panToPointMarker({
				startTime: stop.startTime,
				latitude: stop.latitude,
				longitude: stop.longitude,
			})}
		/>
	), []);

	return (
		<ReportView
			reportType="stops"
			reportTitle="Zastávky"
			renderItem={renderItem}
		/>
	);
}
