import { Text, View } from 'react-native';

/**
 * address with a colored dot matching its map marker, styles come from ReportView
 */
export default function AddressLine({ color, text, styles }) {
	return (
		<View style={styles.addressRow}>
			<View style={[styles.dot, { backgroundColor: color }]} />
			<Text numberOfLines={1} style={styles.addressText}>{text || 'Neznámá adresa'}</Text>
		</View>
	);
}
