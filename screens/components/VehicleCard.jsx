import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons/faLocationCrosshairs';
import { faRoute } from '@fortawesome/free-solid-svg-icons/faRoute';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import GlassView, { useGlassForeground } from './GlassView';
import VehiclePuck from './VehiclePuck';
import VehicleMetrics from './VehicleMetrics';
import { deviceState, deviceStatusLabel, STATE_COLORS } from '../../lib/deviceStatus';
import { activityFormatter } from '../../lib/formatter';
import { colors } from '../../style/useStyles';

const MUTED = '#8e8e93';

const Action = ({ icon, label, onPress, active, foreground }) => {
	const color = active ? '#fff' : foreground;
	return (
		<TouchableOpacity
			style={[styles.action, active && styles.actionActive]}
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityState={{ selected: !!active }}
		>
			<FontAwesomeIcon icon={icon} size={15} color={active ? '#fff' : colors.blue.primary} />
			<Text style={[styles.actionText, { color }]}>{label}</Text>
		</TouchableOpacity>
	);
};

/**
 * card of the selected vehicle at the bottom of the map
 */
export default function VehicleCard({ device, following, onFollow, onTrips, onDetail, onClose, onLayout }) {
	const foreground = useGlassForeground();
	const color = STATE_COLORS[deviceState(device)];
	const position = device.position || {};

	return (
		<GlassView style={styles.card} onLayout={onLayout}>
			<View style={styles.header}>
				<VehiclePuck device={device} size={28} />
				<View style={styles.titles}>
					<Text numberOfLines={1} style={[styles.name, { color: foreground }]}>{device.name}</Text>
					{!!device.model && <Text numberOfLines={1} style={styles.model}>{device.model}</Text>}
				</View>
				<TouchableOpacity style={styles.close} onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zavřít">
					<FontAwesomeIcon icon={faXmark} size={14} color={MUTED} />
				</TouchableOpacity>
			</View>

			<Text style={[styles.status, { color }]}>{deviceStatusLabel(device)}</Text>
			{!!position.address && <Text numberOfLines={2} style={[styles.address, { color: foreground }]}>{position.address}</Text>}
			{!!position.fixTime && <Text style={styles.meta}>Poloha {activityFormatter(position.fixTime)}</Text>}

			<VehicleMetrics device={device} color={foreground} style={styles.metrics} />

			<View style={styles.actions}>
				<Action icon={faLocationCrosshairs} label={following ? 'Sleduji' : 'Sledovat'} active={following} onPress={onFollow} foreground={foreground} />
				<Action icon={faRoute} label="Trasy" onPress={onTrips} foreground={foreground} />
				<Action icon={faCircleInfo} label="Detail" onPress={onDetail} foreground={foreground} />
			</View>
		</GlassView>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 28,
		padding: 16,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	titles: {
		flex: 1,
		marginLeft: 10,
		flexDirection: 'row',
		alignItems: 'baseline',
	},
	name: {
		fontSize: 20,
		fontWeight: '700',
		flexShrink: 1,
	},
	model: {
		fontSize: 13,
		fontWeight: '600',
		color: MUTED,
		marginLeft: 8,
	},
	close: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(128,128,128,0.18)',
		marginLeft: 8,
	},
	status: {
		fontSize: 15,
		fontWeight: '600',
		marginTop: 6,
	},
	address: {
		fontSize: 14,
		marginTop: 4,
	},
	meta: {
		fontSize: 12,
		color: MUTED,
		marginTop: 2,
	},
	metrics: {
		marginTop: 10,
	},
	actions: {
		flexDirection: 'row',
		marginTop: 14,
		marginHorizontal: -4,
	},
	action: {
		flex: 1,
		height: 48,
		marginHorizontal: 4,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(128,128,128,0.14)',
	},
	actionActive: {
		backgroundColor: colors.blue.primary,
	},
	actionText: {
		fontSize: 12,
		fontWeight: '600',
		marginTop: 3,
	},
});
