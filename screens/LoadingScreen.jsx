import { ActivityIndicator, SafeAreaView, View, Text } from "react-native";
import { useAuthContext } from "../lib/context/authContext";
import { useStyles } from "../style/useStyles";

export default Loading = () => {
	const [styles] = useStyles(s => ({
		container: {
			flex: 1,
			backgroundColor: s.bg,
		},
		view: {
			justifyContent: 'center',
			alignItems: 'center',
			flex: 1,
		},
		statusText: {
			...s.text.note,
			marginTop: 16,
			fontSize: 15,
		},
		errorText: {
			...s.text.note,
			marginTop: 16,
			fontSize: 15,
			color: s.colors.red,
		},
	}));

	const { connected, connectionFailed } = useAuthContext();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.view}>
				{connectionFailed ? (
					<Text style={styles.errorText}>Připojení selhalo</Text>
				) : (
					<>
						<ActivityIndicator size="large" />
						{!connected && <Text style={styles.statusText}>Připojování...</Text>}
					</>
				)}
			</View>
		</SafeAreaView>
	);
};
