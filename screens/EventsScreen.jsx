import { TouchableOpacity, View, Text } from "react-native";
import ReportView from "./components/ReportView";
import { formatDateTime } from "../lib/date";
import { memo } from "react";

const eventKeyExtractor = e => e.id;

const EventItem = memo(({ item, selection, panToPointMarker, styles }) => {
	const onItemPress = () => {
		panToPointMarker({
			latitude: item.latitude,
			longitude: item.longitude
		});
	}

	return (
		<TouchableOpacity
			onPress={onItemPress}
			style={[
				styles.listItem,
				{...(selection?.startTime === item.startTime ? styles.listItemSelected : {})}
			]}
		>
			<View style={{ width: 100 }}>
				<Text style={styles.text.base}>{formatDateTime(item.serverTime || item.eventTime)}</Text>
			</View>
			<View>
				<Text style={styles.text.base}>{item.type}</Text>
			</View>
		</TouchableOpacity>
	);
});

export default () => {
	const itemRenderer = (props) => <EventItem {...props} />;

	return (
		<ReportView
			reportType="events"
			reportTitle="Události"
			reportItemRenderer={itemRenderer}
			reportKeyExtractor={eventKeyExtractor}
		/>
	);
}