import { StyleSheet, Text } from 'react-native';
import { COLOR_DRIVING, COLOR_STANDING } from '../../lib/constants';
import { titleFormatter } from '../../lib/formatter';
import { Marker } from 'react-native-maps';
import LocationArrow from '../../assets/location_arrow.js';
import { useDevicesContext } from '../../lib/context/devicesContext';

export default DeviceMarker = ({ device }) => {
	const { setCurrentDevice } = useDevicesContext();
	const ICON_FG = device.moving ? COLOR_DRIVING : COLOR_STANDING;
	const TEXT_BG = device.moving ? styles.colorDriving : styles.colorStanding;
	const ROTATION = parseInt(device.position?.course || 0);

	const onPress = () => {
		setCurrentDevice(device);
	};

	return (
		<Marker
			identifier={device.identifier}
			key={device.id}
			coordinate={{
				latitude: device.position.latitude,
				longitude: device.position.longitude,
			}}
			onCalloutPress={onPress}
			tracksViewChanges={false}
			flat
		>
			<LocationArrow style={[styles.markerIcon, { fill: ICON_FG, transform: [{ rotate: ROTATION + 'deg' }] }]} />
			<Text numberOfLines={1} style={[styles.markerLabel, TEXT_BG, styles.markerText]}>
				{titleFormatter(device)}
			</Text>
		</Marker>
	);
};

const styles = StyleSheet.create({
	markerIcon: {
		stroke: 'black',
		position: 'absolute',
	},
	markerLabel: {
		overflow: 'hidden',
		position: 'absolute',
		top: 30,
		left: 15,
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 6,
		fontSize: 11,
		fontWeight: '600',
	},
	markerText: {
		color: '#fff',
	},
	colorDriving: {
		backgroundColor: COLOR_DRIVING,
	},
	colorStanding: {
		backgroundColor: COLOR_STANDING,
	},
});
