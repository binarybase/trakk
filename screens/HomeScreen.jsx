import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import LocationScreen from './LocationScreen';
import TripsScreen from './TripsScreen';
import StopsScreen from './StopsScreen';
//import EventsScreen from './EventsScreen';
import SettingsScreen from './SettingsScreen';
import LeftPanel from './components/LeftPanel';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMap } from '@fortawesome/free-solid-svg-icons/faMap';
import { faRoad } from '@fortawesome/free-solid-svg-icons/faRoad';
import { faCircleStop } from '@fortawesome/free-solid-svg-icons/faCircleStop';

import { useStyles } from '../style/useStyles';
import { createDevicesContext } from '../lib/context/devicesContext';
import { useCallback, useState } from 'react';
import { AppContext } from '../lib/context/appContext';
import { createTabNavigatorContext } from '../lib/hooks/useFocusedTab';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { useColorScheme } from 'react-native';
//import { useStorage } from '../lib/storage';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TabNavigator = () => {
	const { TabNavigatorContext, onTabPress, currentTab } = createTabNavigatorContext();
	const [ styles ]= useStyles();
	const IconComponent = useCallback(({ focused, icon }) => (<FontAwesomeIcon icon={icon} size={24} color={focused ? styles.colors.blue.primary : styles.fg}  />), [ styles ]);

	return (
		<TabNavigatorContext.Provider  value={{ currentTab }}>
			<Tab.Navigator screenListeners={{
				tabPress: onTabPress,
				headerLargeTitle: true
			}}>
				<Tab.Screen name="Mapa" component={LocationScreen} options={{
					headerShown: false,
					tabBarShowLabel: false,
					tabBarIcon: (props) => (<IconComponent icon={faMap} {...props} />),
				}} />
				<Tab.Screen name="Trasy" component={TripsScreen} options={{
					headerShown: false,
					tabBarShowLabel: false,
					tabBarIcon: (props) => (<IconComponent icon={faRoad} {...props} />)
				}} />
				<Tab.Screen name="Zastávky" component={StopsScreen} options={{
					headerShown: false,
					tabBarShowLabel: false,
					tabBarIcon: (props) => (<IconComponent icon={faCircleStop} {...props} />)
				}} />
				{/*<Tab.Screen name="Události" component={EventsScreen} options={{
					headerShown: false,
					tabBarIcon: (props) => (<IconComponent icon={faRoadCircleExclamation} {...props} />)
				}} />*/}
				<Tab.Screen name="Nastavení" component={SettingsScreen} options={{
					headerShown: false,
					tabBarShowLabel: false,
					headerLargeTitle: true,
					tabBarIcon: (props) => (<IconComponent icon={faGear} {...props} />)
				}} />
			</Tab.Navigator>
		</TabNavigatorContext.Provider>
	)
}

export default () => {
	const theme = useColorScheme();
	const devicesContext = createDevicesContext();
	const { DevicesContext } = devicesContext;
	const [ headerLeft, setHeaderLeft] = useState();
	const [ headerTitle, setHeaderTitle ] = useState();
	const [ headerRight, setHeaderRight ] = useState();

	return (
		<AppContext.Provider value={{
			headerLeft,
			setHeaderLeft,
			headerTitle,
			setHeaderTitle,
			headerRight,
			setHeaderRight
		}}>
			<DevicesContext.Provider value={devicesContext}>
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
								backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.44)'
							},
							...(headerLeft === false ? { headerLeft: null } : {})
						}}
					/>
				</Drawer.Navigator>
			</DevicesContext.Provider>
		</AppContext.Provider>
	);
}