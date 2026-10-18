import { useMemo, useEffect } from 'react';
import { AuthContext, useAuthProvider } from './lib/context/authContext';
import { DevicesContext, useDevicesProvider } from './lib/context/devicesContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import DeviceInfoScreen from './screens/DeviceInfoScreen';
import TripInfoScreen from './screens/TripInfoScreen';
import { useStyles } from './style/useStyles';
import { initCarPlay } from './lib/carplay';
import { migrateCache } from './lib/storage';

const Stack = createNativeStackNavigator();

const HIDDEN_HEADER = { headerShown: false };
const TRIP_INFO_OPTIONS = { title: 'Detail trasy', headerLargeTitle: true };

const App = () => {
	const authContext = useAuthProvider();
	const { loggedIn, token } = authContext;
	const devicesContext = useDevicesProvider(token, loggedIn);
	const [styles, theme] = useStyles();

	useEffect(() => {
		// Initialize CarPlay listeners once
		initCarPlay();
		migrateCache();
	}, []);

	const navigationTheme = useMemo(() => ({
		...DefaultTheme,
		colors: {
			...DefaultTheme.colors,
			primary: styles.fg,
			background: styles.bg,
			card: styles.listBg,
			text: styles.fg,
			border: styles.muted,
			notification: styles.bg,
		},
		dark: theme === 'dark',
	}), [theme, styles]);

	// a stored session opens the app right away, it is validated in the background
	return (
		<SafeAreaProvider>
			<AuthContext.Provider value={authContext}>
				<DevicesContext.Provider value={devicesContext}>
					<NavigationContainer theme={navigationTheme}>
						<Stack.Navigator>
							{!loggedIn ? (
								<Stack.Screen name="LoginScreen" component={LoginScreen} options={HIDDEN_HEADER} />
							) : (
								<>
									<Stack.Screen name="HomeScreen" component={HomeScreen} options={HIDDEN_HEADER} />
									<Stack.Screen name="DeviceInfoScreen" component={DeviceInfoScreen} />
									<Stack.Screen name="TripInfoScreen" component={TripInfoScreen} options={TRIP_INFO_OPTIONS} />
								</>
							)}
						</Stack.Navigator>
					</NavigationContainer>
				</DevicesContext.Provider>
			</AuthContext.Provider>
		</SafeAreaProvider>
	);
};

export default App;
