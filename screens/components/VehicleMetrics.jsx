import { StyleSheet, Text, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faKey } from '@fortawesome/free-solid-svg-icons/faKey';
import { faRoad } from '@fortawesome/free-solid-svg-icons/faRoad';
import { faBatteryHalf } from '@fortawesome/free-solid-svg-icons/faBatteryHalf';
import { odometerOf } from '../../lib/deviceStatus';
import { formatDistance, formatVoltage } from '../../lib/formatter';
import { isBool, isNumber } from '../../lib/util';

const MUTED = '#8e8e93';

/**
 * readings worth a glance: ignition, supply voltage, battery and odometer
 * @returns {Array} [{ key, icon, text }]
 */
export const vehicleMetrics = (device) => {
	const attributes = device.position?.attributes || {};
	const odometer = odometerOf(device);

	return [
		isBool(attributes.ignition) && { key: 'ignition', icon: faKey, text: attributes.ignition ? 'zapnuto' : 'vypnuto' },
		attributes.power > 0 && { key: 'power', icon: faBolt, text: formatVoltage(attributes.power) },
		isNumber(attributes.batteryLevel) && { key: 'battery', icon: faBatteryHalf, text: `${attributes.batteryLevel} %` },
		odometer > 0 && { key: 'odometer', icon: faRoad, text: formatDistance(odometer) },
	].filter(Boolean);
};

export default function VehicleMetrics({ device, color, size = 13, style }) {
	const metrics = vehicleMetrics(device);
	if (!metrics.length) {
		return null;
	}

	return (
		<View style={[styles.row, style]}>
			{metrics.map(({ key, icon, text }) => (
				<View key={key} style={styles.metric}>
					<FontAwesomeIcon icon={icon} size={size - 1} color={MUTED} />
					<Text style={[styles.text, { color, fontSize: size }]}>{text}</Text>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	metric: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 12,
		marginTop: 2,
	},
	text: {
		fontWeight: '500',
		marginLeft: 5,
	},
});
