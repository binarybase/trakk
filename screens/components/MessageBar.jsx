import { TextInput, TouchableOpacity, View } from "react-native";
import { useStyles } from "../../style/useStyles";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCircleUp } from "@fortawesome/free-solid-svg-icons";

export default function MessageBar({ value, onSubmit, setValue }) {
	const [styles] = useStyles(s => ({
		view: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderTopWidth: 0.5,
			borderTopColor: s.separator,
			backgroundColor: s.bg,
		},
		textInput: {
			flex: 1,
			backgroundColor: s.cardBg,
			borderRadius: 20,
			paddingHorizontal: 16,
			paddingVertical: 10,
			fontSize: 15,
			color: s.fg,
		},
		button: {
			marginLeft: 10,
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: s.colors.blue.primary,
			alignItems: 'center',
			justifyContent: 'center',
		},
	}));

	return (
		<View style={styles.view}>
			<TextInput
				value={value}
				onChangeText={setValue}
				style={styles.textInput}
				autoComplete="off"
				placeholder="Příkaz..."
				placeholderTextColor={styles.colors.gray.light}
			/>
			<TouchableOpacity onPress={onSubmit} style={styles.button} activeOpacity={0.7}>
				<FontAwesomeIcon icon={faCircleUp} size={22} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}
