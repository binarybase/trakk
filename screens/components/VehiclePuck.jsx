import { StyleSheet, Text, View } from 'react-native';
import LocationArrow from '../../assets/location_arrow.js';
import { DEVICE_STATE, deviceState, STATE_COLORS } from '../../lib/deviceStatus';

/**
 * vehicle state badge shared by the map, the vehicle card and the list:
 * heading arrow while moving, "P" otherwise, colored by state
 */
export default function VehiclePuck({ device, size = 30, elevated = false }) {
	const state = deviceState(device);
	const rotation = Math.round(Number(device.position?.course) || 0);
	const glyphSize = Math.round(size * 0.5);
	const dimensions = {
		width: size,
		height: size,
		borderRadius: size / 2,
		borderWidth: Math.max(2, size / 12),
		backgroundColor: STATE_COLORS[state],
	};

	return (
		<View style={[styles.puck, elevated && styles.elevated, dimensions]}>
			{state === DEVICE_STATE.MOVING ? (
				<LocationArrow
					width={glyphSize}
					height={glyphSize}
					fill="#fff"
					style={{ transform: [{ rotate: `${rotation}deg` }] }}
				/>
			) : (
				<Text style={[styles.glyph, { fontSize: Math.round(size * 0.47) }]}>P</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	puck: {
		borderColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	elevated: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	glyph: {
		color: '#fff',
		fontWeight: '800',
	},
});
