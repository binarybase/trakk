import { Fragment } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faListUl } from '@fortawesome/free-solid-svg-icons/faListUl';
import GlassView, { useGlassForeground } from './GlassView';
import { pluralize } from '../../lib/formatter';
import { COLOR_DRIVING } from '../../lib/constants';
import { colors } from '../../style/useStyles';

export const CONTROL_SIZE = 44;

/**
 * vertical stack of round map buttons
 * @param {Array} props.buttons - [{ icon, onPress, label, active }]
 */
export function ControlStack({ buttons }) {
	const foreground = useGlassForeground();

	return (
		<GlassView style={styles.stack}>
			{buttons.map(({ icon, onPress, label, active }, index) => (
				<Fragment key={label}>
					{index > 0 && <View style={styles.separator} />}
					<TouchableOpacity
						style={styles.control}
						onPress={onPress}
						accessibilityRole="button"
						accessibilityLabel={label}
						accessibilityState={{ selected: !!active }}
					>
						<FontAwesomeIcon icon={icon} size={18} color={active ? colors.blue.primary : foreground} />
					</TouchableOpacity>
				</Fragment>
			))}
		</GlassView>
	);
}

/**
 * fleet overview pill, opens the vehicle list
 */
export function FleetSummary({ count, moving, online, onPress }) {
	const foreground = useGlassForeground();
	const label = `${count} ${pluralize(count, 'vozidlo', 'vozidla', 'vozidel')}`;

	return (
		<TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={`Seznam vozidel, ${label}, ${moving} v pohybu`}>
			<GlassView style={styles.pill}>
				<FontAwesomeIcon icon={faListUl} size={15} color={foreground} />
				<Text style={[styles.pillText, { color: foreground }]}>{label}</Text>
				{moving > 0 && (
					<View style={styles.moving}>
						<View style={styles.movingDot} />
						<Text style={styles.movingText}>{moving}</Text>
					</View>
				)}
				{!online && <Text style={styles.offlineText}>Offline</Text>}
			</GlassView>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	stack: {
		width: CONTROL_SIZE,
		borderRadius: CONTROL_SIZE / 2,
	},
	control: {
		width: CONTROL_SIZE,
		height: CONTROL_SIZE,
		alignItems: 'center',
		justifyContent: 'center',
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginHorizontal: 10,
		backgroundColor: 'rgba(128,128,128,0.4)',
	},
	pill: {
		height: CONTROL_SIZE,
		borderRadius: CONTROL_SIZE / 2,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
	pillText: {
		fontSize: 15,
		fontWeight: '600',
		marginLeft: 10,
	},
	moving: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 10,
	},
	movingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: COLOR_DRIVING,
		marginRight: 4,
	},
	movingText: {
		fontSize: 15,
		fontWeight: '700',
		color: COLOR_DRIVING,
	},
	offlineText: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.red,
		marginLeft: 10,
	},
});
