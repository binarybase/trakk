import { View, ActivityIndicator, Text } from "react-native";
import { useStyles } from "../../style/useStyles";

export default LoadingView = ({
	text = "Načítání...",
	error = false,
	errorText = "Načítání selhalo"
}) => {
	const [styles] = useStyles(s => ({
		view: {
			backgroundColor: s.bg,
			justifyContent: 'center',
			alignItems: 'center',
			flex: 1,
		},
		loadingText: {
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

	return (
		<View style={styles.view}>
			{!error && <ActivityIndicator size="large" />}
			<Text style={error ? styles.errorText : styles.loadingText}>
				{error ? errorText : text}
			</Text>
		</View>
	);
};
