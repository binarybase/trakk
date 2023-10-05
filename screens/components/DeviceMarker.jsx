import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { COLOR_DRIVING, COLOR_STANDING } from '../../lib/constants';
import { titleFormatter } from '../../lib/formatter';
import { View, Text } from 'react-native';
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
	}

	return (
		<Marker
			identifier={device.identifier}
			key={device.id}
			coordinate={{
				latitude: device.position.latitude,
				longitude: device.position.longitude
			}}
			onCalloutPress={onPress}
			tracksViewChanges={false}
			flat={true}
		>
			{/*<FontAwesomeIcon icon={faLocationArrow} size={24} color={ICON_FG} style={[styles.markerIcon, { transform: [{ rotate: ROTATION + 'deg'}] }]} />*/}
			<LocationArrow style={[styles.markerIcon, { fill: ICON_FG, transform: [{ rotate: ROTATION + 'deg'}] }]} />
			<Text numberOfLines={1} style={[styles.markerLabel, TEXT_BG, styles.markerText]}>{titleFormatter(device)}</Text>
		</Marker>
	);
}

const styles = StyleSheet.create({
	marker: {
		
	},
	markerIcon: {
		stroke: 'black',
		position: 'absolute'
	},
	markerLabel: {
		overflow: 'hidden',
		position: 'absolute',
		top: 30,
		left: 15,
		padding: 3,
		borderWidth: 1,
		borderRadius: 3,
		borderColor: 'rgba(40,40,40,0.85)'
	},
	markerText: {
		color: '#FFF'
	},
	colorDriving: {
		backgroundColor: COLOR_DRIVING,
	},
	colorStanding: {
		backgroundColor: COLOR_STANDING
	}
})