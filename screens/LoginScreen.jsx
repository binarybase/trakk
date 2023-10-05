import { KeyboardAvoidingView, View, Text, TextInput, TouchableOpacity, useColorScheme, Dimensions } from "react-native";
import { useAuthContext, AUTH_STATUS } from "../lib/context/authContext";
import { colors, useStyles } from '../style/useStyles';
import { isEmpty } from '../lib/util';
import { useState } from "react";
import { useHeaderHeight } from "@react-navigation/elements"
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faLocationArrow } from "@fortawesome/free-solid-svg-icons/faLocationArrow";

const emailText = "E-mail";
const pwText = "Heslo";
const loggingInText = "Přihlašování...";
const loginText = "Přihlásit";
const validationErrorText = "Zadejte, prosím platné údaje.";
const invalidCredentialsText = "Neplatné přihlašovací údaje.";
const requestFailedText = "Přihlášení selhalo.";
const networkErrorText = 'Chyba připojení';


export default Login = () => {
	const screenH = Dimensions.get('screen').height;
	const h = useHeaderHeight();
	const [ styles ]= useStyles(s => ({
		heading: {
			...s.text.h1,
			marginBottom: 24
		},
		container: {
			paddingTop: h,
			backgroundColor: s.bg,
			padding: 10,
			flex: 1,
			height: screenH,
			flexDirection: 'column'
		},
		containerInner: {
			alignItems: 'center',
			flexDirection: 'column',
			//height: screenH,
			width: '100%',
			justifyContent: 'center',
			//alignContent: 'center',
			flex: 1
		},
		touchable: {
			marginTop: 16
		}
	}));

	const [ inputEmail, setInputEmail ] = useState(null);
	const [ inputPw, setInputPw ] = useState(null);
	const [ loading, setLoading ] = useState(false);
	const [ hasError, setHasError ] = useState(false);
	const [ errorText, setErrorText ] = useState('');
	const { authStrategy } = useAuthContext();

	const validateForm = () => {
		if(isEmpty(inputEmail) || isEmpty(inputPw)){
			setHasError(true);
			setErrorText(validationErrorText);
			return false;
		}

		return true;
	}

	const doLoginProcess = async () => {
		setHasError(false);
		setErrorText('');
		if(!validateForm())
			return;

		setLoading(true);
		const status = await authStrategy(inputEmail, inputPw);
		setLoading(false);

		switch(status){
			case AUTH_STATUS.INVALID_CREDENTIALS:
				setHasError(true);
				setErrorText(invalidCredentialsText);
				break;
			case AUTH_STATUS.REQUEST_FAILED:
				setHasError(true);
				setErrorText(requestFailedText);
				break;
			case AUTH_STATUS.NETWORK_ERROR:
				setHasError(true);
				setErrorText(networkErrorText);
				break;
		}
	}

	return (
		<KeyboardAvoidingView 
			contentInsetAdjustmentBehavior="automatic"
			style={styles.container}
			contentContainerStyle={styles.containerInner}
			behavior="padding"
		>
			<View style={[styles.content.normal, { alignItems: "center", justifyContent: "center", flex: 1 }]}>
				<FontAwesomeIcon icon={faLocationArrow} size={32} style={styles.text.h1} />
				<Text style={styles.heading}>Trakk</Text>
				{hasError === true && (
					<Text style={styles.text.note}>{errorText}</Text>	
				)}
				<TextInput
					style={[styles.input.large, {textAlign: "center"}]}
					placeholder={emailText}
					autoFocus={true}
					onChangeText={(v) => setInputEmail(v)}
					value={inputEmail}
				/>
				<TextInput
					style={[styles.input.large, {textAlign: "center"}]}
					placeholder={pwText}
					secureTextEntry={true}
					onSubmitEditing={doLoginProcess}
					onChangeText={(v) => setInputPw(v)}
					value={inputPw}
				/>
				<TouchableOpacity style={[styles.btn.btn, styles.btn.primary, loading ? styles.btn.disabled : null, { width: 150 }]} onPress={doLoginProcess} disabled={loading}>
					<Text style={styles.btn.primaryText}>{loading ? loggingInText : loginText}</Text>
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	)
}