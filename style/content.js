import {Dimensions} from "react-native";

export default () => ({
	normal: {
		width: Dimensions.get('window').width,
		paddingLeft: 40,
		paddingRight: 40
	},
	tight: {
		paddingLeft: 20,
		paddingRight: 20
	},
	justifyCenter: {
		justifyContent: "center"
	}
})