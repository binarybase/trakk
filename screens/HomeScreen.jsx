import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import LocationScreen from './LocationScreen';
import TripsScreen from './TripsScreen';
import StopsScreen from './StopsScreen';
import SettingsScreen from './SettingsScreen';
import LeftPanel from './components/LeftPanel';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMap } from '@fortawesome/free-solid-svg-icons/faMap';
import { faRoad } from '@fortawesome/free-solid-svg-icons/faRoad';
import { faCircleStop } from '@fortawesome/free-solid-svg-icons/faCircleStop';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';

import { useStyles } from '../style/useStyles';
import { useCallback, useState } from 'react';
import { AppContext } from '../lib/context/appContext';
import { useTabNavigator } from '../lib/hooks/useFocusedTab';
import { useColorScheme } from 'react-native';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TabNavigator = () => {
	const { TabNavigatorContext, onTabPress, currentTab } = useTabNavigator();
	const [styles] = useStyles();

	const TabIcon = useCallback(
		({ focused, icon }) => (
			<FontAwesomeIcon icon={icon} size={22} color={focused ? styles.colors.blue.primary : styles.fg} />
		),
		[styles]
	);

	return (
		<TabNavigatorContext.Provider value={{ currentTab }}>
			<Tab.Navigator
				screenListeners={{ tabPress: onTabPress }}
				screenOptions={{
					headerShown: false,
					tabBarShowLabel: false,
				}}
			>
				<Tab.Screen
					name="Mapa"
					component={LocationScreen}
					options={{ tabBarIcon: (props) => <TabIcon icon={faMap} {...props} /> }}
				/>
				<Tab.Screen
					name="Trasy"
					component={TripsScreen}
					options={{ tabBarIcon: (props) => <TabIcon icon={faRoad} {...props} /> }}
				/>
				<Tab.Screen
					name="Zastávky"
					component={StopsScreen}
					options={{ tabBarIcon: (props) => <TabIcon icon={faCircleStop} {...props} /> }}
				/>
				<Tab.Screen
					name="Nastavení"
					component={SettingsScreen}
					options={{ tabBarIcon: (props) => <TabIcon icon={faGear} {...props} /> }}
				/>
			</Tab.Navigator>
		</TabNavigatorContext.Provider>
	);
};

export default () => {
	const theme = useColorScheme();
	const [headerLeft, setHeaderLeft] = useState();
	const [headerTitle, setHeaderTitle] = useState();
	const [headerRight, setHeaderRight] = useState();

	return (
		<AppContext.Provider value={{
			headerLeft,
			setHeaderLeft,
			headerTitle,
			setHeaderTitle,
			headerRight,
			setHeaderRight,
		}}>
			<Drawer.Navigator
				drawerContent={(props) => <LeftPanel {...props} />}
			>
				<Drawer.Screen
					name="Trakk"
					component={TabNavigator}
					options={{
						swipeEnabled: true,
						headerTitle,
						headerRight,
						headerTransparent: true,
						headerBackgroundContainerStyle: {
							backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
						},
						...(headerLeft === false ? { headerLeft: null } : {}),
					}}
				/>
			</Drawer.Navigator>
		</AppContext.Provider>
	);
};
