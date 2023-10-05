import { ActivityIndicator, SafeAreaView, StyleSheet, View, useColorScheme, Text } from "react-native";
import colors from "../style/colors";
import { useAuthContext } from "../lib/context/authContext";
import { useStyles } from "../style/useStyles";
import { TouchableOpacity } from "react-native-gesture-handler";

export default Loading = () => {
	const [ styles ]= useStyles(s => ({
		container: {
			flex: 1 
		},
		view: {
			justifyContent: "center",
			alignItems: "center",
			flex: 1
		},
		loadingText: {
			...s.text.note,
			marginTop: 10
		}
	}))
	const { connected, connectionFailed } = useAuthContext();

	return (
		<SafeAreaView style={[styles.container, [{
			backgroundColor: styles.bg
		}]]}>
			<View style={styles.view}>
				{connectionFailed ? (
					<View>
						<Text style={styles.loadingText}>Připojení selhalo</Text>
						<TouchableOpacity>Zkusit znovu</TouchableOpacity>
					</View>
				) : (
					<View>
						<ActivityIndicator size={"large"} />
						{!connected && <Text style={styles.loadingText}>Připojování...</Text>}
					</View>
				)}
			</View>
		</SafeAreaView>
	)
}
