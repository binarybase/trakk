import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Marker } from 'react-native-maps';
import VehiclePuck from './VehiclePuck';
import { DEVICE_STATE, deviceState, STATE_COLORS } from '../../lib/deviceStatus';
import { formatSpeed } from '../../lib/formatter';

const HALO_SIZE = 46;
const LABEL_GAP = 3;
const LABEL_HEIGHT = 20;
// MapKit centers the view on the coordinate; shift it so the puck sits there instead of the puck and label
const CENTER_OFFSET = { x: 0, y: (LABEL_GAP + LABEL_HEIGHT) / 2 };

/**
 * Vehicle marker: a puck colored by state with a heading arrow while moving,
 * "P" while parked, and a name capsule below.
 *
 * @param {Object} props.device - device with position
 * @param {Boolean} [props.selected] - emphasized with a halo
 * @param {Function} [props.onPress] - called with the device
 */
export default function DeviceMarker({ device, selected = false, onPress }) {
	const dark = useColorScheme() === 'dark';
	const state = deviceState(device);
	const color = STATE_COLORS[state];
	const moving = state === DEVICE_STATE.MOVING;

	return (
		<Marker
			identifier={device.identifier}
			coordinate={{
				latitude: device.position.latitude,
				longitude: device.position.longitude,
			}}
			onPress={onPress && (() => onPress(device))}
			centerOffset={CENTER_OFFSET}
			zIndex={selected ? 3 : moving ? 2 : 1}
			tracksViewChanges={false}
		>
			<View style={styles.container}>
				<View style={[styles.halo, selected && styles.haloSelected]}>
					<VehiclePuck device={device} elevated />
				</View>
				<View style={[styles.label, dark && styles.labelDark]}>
					<Text numberOfLines={1} style={[styles.labelText, dark && styles.labelTextDark]}>
						{device.name}
						{moving && <Text style={[styles.speedText, { color }]}>{`  ${formatSpeed(device.position.speed)}`}</Text>}
					</Text>
				</View>
			</View>
		</Marker>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
	},
	halo: {
		width: HALO_SIZE,
		height: HALO_SIZE,
		borderRadius: HALO_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	haloSelected: {
		backgroundColor: 'rgba(0,122,255,0.28)',
	},
	label: {
		marginTop: LABEL_GAP,
		height: LABEL_HEIGHT,
		maxWidth: 160,
		paddingHorizontal: 8,
		borderRadius: LABEL_HEIGHT / 2,
		justifyContent: 'center',
		backgroundColor: 'rgba(255,255,255,0.95)',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.18,
		shadowRadius: 2,
	},
	labelDark: {
		backgroundColor: 'rgba(38,38,40,0.95)',
	},
	labelText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1c1c1e',
	},
	labelTextDark: {
		color: '#f5f5f7',
	},
	speedText: {
		fontWeight: '700',
	},
});
