import { memo } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import ReportView from "./components/ReportView";
import { formatDateTime, formatDuration } from "../lib/date";

export default () => {
	const StopsItem = memo(({ item, selectionPoint, panToPointMarker, styles }) => {
		const onItemPress = () => {
			panToPointMarker({
				startTime: item.startTime,
				latitude: item.latitude,
				longitude: item.longitude
			});
		}

		return (
			<TouchableOpacity
				onPress={onItemPress}
				style={[
					styles.listItem,
					{...(selectionPoint?.startTime === item.startTime ? styles.listItemSelected : {})}
				]}
			>
				<View style={{ width: 100 }}>
					<Text style={styles.text.base}>{formatDateTime(item.startTime)}</Text>
					<Text style={styles.text.base}>{formatDateTime(item.endTime)}</Text>
				</View>
				<View style={{ width: 80 }}>
					<Text style={styles.text.base}>{formatDuration(item.duration)}</Text>
				</View>
				<View>
					<Text style={styles.text.base}>{item.address}</Text>
				</View>
			</TouchableOpacity>
		)
	});

	const itemRenderer = (props) => <StopsItem {...props} />

	return (
		<ReportView
			reportType="stops"
			reportTitle="Zastávky"
			reportItemRenderer={itemRenderer}
		/>
	)
}