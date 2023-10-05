import { TouchableOpacity, View, Text } from "react-native";
import ReportView from "./components/ReportView";
import { formatDistance, formatDistanceKm, formatSpeed } from '../lib/formatter';
import { durationBetweenDates, formatDateTime, formatDuration } from "../lib/date";
import { memo } from "react";

const TripItem = memo(({ navigate, item, selection, setSelection, currentDevice, styles }) => {
	const onItemLongPress = () => {
		navigate("TripInfoScreen", {
			trip: item
		})
	}

	const onItemPress = () => {
		setSelection(item);
	}

	return (
		<TouchableOpacity
			onLongPress={onItemLongPress}
			onPress={onItemPress}
			style={[
				styles.listItem,
				{...(selection?.startTime === item.startTime ? styles.listItemSelected : {})}
			]}
		>
			<View style={{ width: 100 }}>
				<Text style={styles.text.base}>{formatDateTime(item.startTime)}</Text>
				<Text style={styles.text.base}>{formatDateTime(item.endTime)}</Text>
			</View>
			<View style={{ width: 80 }}>
				<Text style={styles.text.base}>{currentDevice?.position?.protocol === 'teltonika' ? formatDistanceKm(item.distance) : formatDistance(item.distance)}</Text>
				<Text style={styles.text.base}>{formatDuration(durationBetweenDates(item.endTime, item.startTime))}</Text>
			</View>
			<View>
				<Text style={styles.text.base}>{item.startAddress}</Text>
				<Text style={styles.text.base}>{item.endAddress}</Text>
			</View>
		</TouchableOpacity>
	);
});

export default ({ navigation }) => {
	const navigate = navigation.navigate;
	const itemRenderer = (props) => <TripItem {...props} navigate={navigate} />;

	return (
		<ReportView
			reportType="trips"
			reportTitle="Trasy"
			reportItemRenderer={itemRenderer}
		/>
	);
}