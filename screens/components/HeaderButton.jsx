import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { colors } from '../../style/useStyles';

/**
 * icon button for navigation headers
 */
export const HeaderButton = ({ icon, onPress, accessibilityLabel }) => (
	<TouchableOpacity
		style={styles.button}
		onPress={onPress}
		accessibilityRole="button"
		accessibilityLabel={accessibilityLabel}
		hitSlop={8}
	>
		<FontAwesomeIcon icon={icon} size={20} color={colors.blue.primary} />
	</TouchableOpacity>
);

export const HeaderButtons = ({ children }) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		marginRight: 8,
	},
	button: {
		padding: 8,
	},
});
