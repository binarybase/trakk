import { Text, View } from 'react-native';
import { useAuthContext } from '../../lib/context/authContext';
import { useStyles } from '../../style/useStyles';

/**
 * header title with a connection hint while the server is unreachable
 */
export default function HeaderTitle({ children }) {
	const { online } = useAuthContext();
	const [styles] = useStyles(s => ({
		container: {
			alignItems: 'center',
		},
		title: {
			fontSize: 17,
			fontWeight: '600',
			color: s.fg,
		},
		offline: {
			fontSize: 11,
			fontWeight: '600',
			color: s.colors.red,
		},
	}));

	return (
		<View style={styles.container}>
			<Text numberOfLines={1} style={styles.title}>{children}</Text>
			{!online && <Text style={styles.offline}>Offline – zobrazuji poslední data</Text>}
		</View>
	);
}
