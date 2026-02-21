import { useMemo, useEffect } from 'react';
import { AuthContext, useAuthProvider } from './lib/context/authContext';
import { DevicesContext, useDevicesProvider } from './lib/context/devicesContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import LoadingScreen from './screens/LoadingScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import DeviceInfoScreen from './screens/DeviceInfoScreen';
import DeviceEventsScreen from './screens/DeviceEventsScreen';
import 'react-native-gesture-handler';
import { useStyles } from './style/useStyles';
import { useColorScheme } from 'react-native';
import TripInfoScreen from './screens/TripInfoScreen';
import { initCarPlay } from './lib/carplay';

const Stack = createNativeStackNavigator();

const App = () => {
	const authContext = useAuthProvider();
	const { connected, loggedIn, token } = authContext;
	const devicesContext = useDevicesProvider(token, loggedIn);
	const [styles] = useStyles();
	const theme = useColorScheme();

	// Initialize CarPlay listeners once
	useEffect(() => {
		initCarPlay();
	}, []);

	const Theme = useMemo(() => ({
		...DefaultTheme,
		colors: {
			...DefaultTheme.colors,
			primary: styles.fg,
			background: styles.bg,
			card: styles.colors.opacity01[theme],
			text: styles.fg,
			border: styles.colors.gray[theme],
			notification: styles.bg,
		},
		dark: theme === 'dark',
	}), [theme, styles]);

	return (
		<AuthContext.Provider value={authContext}>
			<DevicesContext.Provider value={devicesContext}>
				<NavigationContainer theme={Theme}>
					<Stack.Navigator>
						{!connected ? (
							<Stack.Screen
								name="LoadingScreen"
								component={LoadingScreen}
								options={{ headerShown: false }}
							/>
						) : !loggedIn ? (
							<Stack.Screen
								name="Přihlášení"
								component={LoginScreen}
								options={{ headerShown: false }}
							/>
						) : (
							<>
								<Stack.Screen
									name="HomeScreen"
									component={HomeScreen}
									options={{ headerShown: false }}
								/>
								<Stack.Screen name="DeviceInfoScreen" component={DeviceInfoScreen} />
								<Stack.Screen name="DeviceEventsScreen" component={DeviceEventsScreen} />
								<Stack.Screen name="TripInfoScreen" component={TripInfoScreen} />
							</>
						)}
					</Stack.Navigator>
				</NavigationContainer>
			</DevicesContext.Provider>
		</AuthContext.Provider>
	);
};

export default App;
