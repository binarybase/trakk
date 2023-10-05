import { useState, useEffect } from 'react';
import { createAuthContext } from './lib/context/authContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import LoadingScreen from './screens/LoadingScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import DeviceInfoScreen from './screens/DeviceInfoScreen';
import DeviceEventsScreen from './screens/DeviceEventsScreen';
import 'react-native-gesture-handler';
import { useStyles } from './style/useStyles';
import { AppState, useColorScheme } from 'react-native';
import TripInfoScreen from './screens/TripInfoScreen';

let timerHandle;
let tries = 0;
const Stack = createNativeStackNavigator();

const App = () => {
	const [ loading, setLoading ] = useState(true);
	const { AuthContext, ...authContextValue } = createAuthContext();
	const { connected, setConnected, setConnectionFailed, checkSession, loggedIn } = authContextValue;
	const [ styles ]= useStyles();
	const theme = useColorScheme();

	const Theme = {
		...DefaultTheme,
		colors: {
			...DefaultTheme.colors,
			primary: styles.fg,
			background: styles.bg,
			card: styles.colors.opacity01[theme],
			text: styles.fg,
			border: styles.colors.gray[theme],
			notification: styles.bg,
			dark: theme === 'dark'
		}
	}

	const doSessionCheck = () => {
		checkSession().then(hasSession => {
			console.log("doSessionCheck: checking session... response", hasSession);
			setConnected(true);
			// network retry
			if(hasSession === null){
				// update tries
				tries++;
				// max tries reached...
				if(tries > 10){
					setConnectionFailed(true);
					return;
				}
				
				// retry
				setConnected(false);
				console.log("doSessionCheck: retrying...", tries);
				timerHandle = setTimeout(doSessionCheck, 10000);
				return;
			}

			setLoading(false);
		});

		return () => {
			tries = 0;
			clearTimeout(timerHandle);
		}
	}

	// check session at first on init
	useEffect(() => {
		const unsubscribe = doSessionCheck();
		const subscription = AppState.addEventListener('change', doSessionCheck);

		return () => {
			subscription.remove();
			unsubscribe();
		}
	}, [])

	return (
		<AuthContext.Provider value={authContextValue}>
			<NavigationContainer theme={Theme}>
				<Stack.Navigator>
					{
						!connected || loading === true ? (
							<Stack.Screen name="LoadingScreen" component={LoadingScreen} options={{headerShown: false}} />
						) : loggedIn === true ?
						(<>
							<Stack.Screen name="HomeScreen" component={HomeScreen} options={{
								headerShown: false
							}} />
							<Stack.Screen name="DeviceInfoScreen" component={DeviceInfoScreen} />
							<Stack.Screen name="DeviceEventsScreen" component={DeviceEventsScreen} />
							<Stack.Screen name="TripInfoScreen" component={TripInfoScreen} />
						</>) :
						(<Stack.Screen name="Přihlášení" component={LoginScreen} options={{ headerShown: false }} />)
					}
				</Stack.Navigator>
			</NavigationContainer>
		</AuthContext.Provider>
	)
}

export default App;
