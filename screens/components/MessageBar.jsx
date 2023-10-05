import { TextInput, TouchableOpacity, View } from "react-native";
import { useStyles } from "../../style/useStyles";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCircleUp } from "@fortawesome/free-solid-svg-icons";

export default MessageBar = ({ value, onSubmit, setValue }) => {
	const [ styles ] = useStyles(s => ({
		view: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center"
		},
		textInput: {
			...s.input.text,
			borderRadius: 18,
			backgroundColor: s.bg,
			flex: 1,
			paddingLeft: 10,
			paddingRight: 10
		},
		button: {
			...s.btn.btn,
			...s.btn.red,
			marginLeft: 10,
			paddingLeft: 10,
			paddingRight: 10
		},
		icon: {
			...s.colors.red
		}
	}));
	
	return (
		<View style={styles.view}>
			<TextInput value={value} onChangeText={setValue} style={styles.textInput} autoComplete={"off"}  />
			<TouchableOpacity onPress={onSubmit} style={styles.button}>
				<FontAwesomeIcon icon={faCircleUp} size={24} style={styles.icon} />
			</TouchableOpacity>
		</View>
	)
}