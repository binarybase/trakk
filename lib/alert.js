import { Alert } from 'react-native';

export const emptyAction = () => {}
export const confirm = ({ title, message }) => new Promise((resolve, reject) => {
	Alert.alert(title, message, [{
		text: 'Zrušit',
		style: 'cancel',
		onPress: reject
	}, {
		text: 'Potvrdit',
		style: 'destructive',
		onPress: resolve
	}]);
})

export const alert = (title) => Alert.alert(title);