import { useState, useEffect, useMemo } from 'react';
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
import { useColorScheme } from 'react-native';
import TripInfoScreen from './screens/TripInfoScreen';

const Stack = createNativeStackNavigator();

const App = () => {
	const { AuthContext, ...authContextValue } = createAuthContext();
	const { connected, loggedIn } = authContextValue;
	const [ styles ]= useStyles();
	const theme = useColorScheme();

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
			dark: theme === 'dark'
		}
	}), [ theme, styles ]);

	return (
		<AuthContext.Provider value={authContextValue}>
			<NavigationContainer theme={Theme}>
				<Stack.Navigator>
					{
						// not connected to the server
						!connected ? (
							<Stack.Screen name="LoadingScreen" component={LoadingScreen} options={{headerShown: false}} />
						) :
						// user not logged in
						!loggedIn ? (
							(<Stack.Screen name="Přihlášení" component={LoginScreen} options={{ headerShown: false }} />)
						) :
						// authenticated
						(<>
							<Stack.Screen name="HomeScreen" component={HomeScreen} options={{
								headerShown: false
							}} />
							<Stack.Screen name="DeviceInfoScreen" component={DeviceInfoScreen} />
							<Stack.Screen name="DeviceEventsScreen" component={DeviceEventsScreen} />
							<Stack.Screen name="TripInfoScreen" component={TripInfoScreen} />
						</>)
					}
				</Stack.Navigator>
			</NavigationContainer>
		</AuthContext.Provider>
	)
}

export default App;
