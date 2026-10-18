import { KeyboardAvoidingView, View, Text, TextInput, TouchableOpacity, Dimensions } from "react-native";
import { useAuthContext, AUTH_STATUS } from "../lib/context/authContext";
import { useStyles } from '../style/useStyles';
import { isEmpty } from '../lib/util';
import { useRef, useState } from "react";
import { useHeaderHeight } from "@react-navigation/elements";
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

export default function LoginScreen() {
	const screenH = Dimensions.get('screen').height;
	const h = useHeaderHeight();
	const [styles] = useStyles(s => ({
		container: {
			paddingTop: h,
			backgroundColor: s.bg,
			flex: 1,
			height: screenH,
		},
		content: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: 32,
		},
		logoIcon: {
			marginBottom: 8,
			color: s.colors.blue.primary,
		},
		heading: {
			...s.text.h1,
			marginBottom: 48,
			letterSpacing: 1,
		},
		errorText: {
			...s.text.note,
			color: s.colors.red,
			marginBottom: 16,
			textAlign: 'center',
		},
		input: {
			fontSize: 16,
			color: s.fg,
			backgroundColor: s.cardBg,
			borderRadius: 14,
			padding: 16,
			marginBottom: 12,
			width: '100%',
		},
		loginBtn: {
			...s.btn.btn,
			...s.btn.primary,
			width: '100%',
			marginTop: 8,
		},
		loginBtnText: {
			...s.btn.primaryText,
		},
	}));

	const [inputEmail, setInputEmail] = useState(null);
	const [inputPw, setInputPw] = useState(null);
	const [loading, setLoading] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [errorText, setErrorText] = useState('');
	const { authStrategy } = useAuthContext();
	const passwordRef = useRef();

	const validateForm = () => {
		if (isEmpty(inputEmail) || isEmpty(inputPw)) {
			setHasError(true);
			setErrorText(validationErrorText);
			return false;
		}
		return true;
	};

	const doLoginProcess = async () => {
		setHasError(false);
		setErrorText('');
		if (!validateForm()) return;

		setLoading(true);
		const status = await authStrategy(inputEmail, inputPw);
		setLoading(false);

		switch (status) {
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
	};

	return (
		<KeyboardAvoidingView
			contentInsetAdjustmentBehavior="automatic"
			style={styles.container}
			behavior="padding"
		>
			<View style={styles.content}>
				<FontAwesomeIcon icon={faLocationArrow} size={36} style={styles.logoIcon} />
				<Text style={styles.heading}>Trakk</Text>

				{hasError && (
					<Text style={styles.errorText}>{errorText}</Text>
				)}

				<TextInput
					style={styles.input}
					placeholder={emailText}
					placeholderTextColor={styles.colors.gray.light}
					autoFocus
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="email-address"
					textContentType="username"
					autoComplete="email"
					returnKeyType="next"
					onSubmitEditing={() => passwordRef.current?.focus()}
					onChangeText={setInputEmail}
					value={inputEmail}
				/>
				<TextInput
					ref={passwordRef}
					style={styles.input}
					placeholder={pwText}
					placeholderTextColor={styles.colors.gray.light}
					secureTextEntry
					textContentType="password"
					autoComplete="password"
					returnKeyType="go"
					onSubmitEditing={doLoginProcess}
					onChangeText={setInputPw}
					value={inputPw}
				/>

				<TouchableOpacity
					style={[styles.loginBtn, loading && styles.btn.disabled]}
					onPress={doLoginProcess}
					disabled={loading}
					activeOpacity={0.7}
				>
					<Text style={styles.loginBtnText}>{loading ? loggingInText : loginText}</Text>
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
}
