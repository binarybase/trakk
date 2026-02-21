import {Dimensions} from "react-native";

export default () => ({
	normal: {
		width: Dimensions.get('window').width,
		paddingHorizontal: 24,
	},
	tight: {
		paddingHorizontal: 16,
	},
	justifyCenter: {
		justifyContent: "center",
	}
})