import { useStyles } from '../style/useStyles';
import { useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DevicePropertiesScreen from './DevicePropertiesScreen';
import DeviceEventsScreen from './DeviceEventsScreen';
import DeviceInfoContext from '../lib/context/deviceInfoContext';
import { faInfoCircle, faExclamationTriangle, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import DeviceCommandsScreen from './DeviceCommandsScreen';

export default DeviceInfoScreen = ({ navigation, route }) => {
	const TabNavigator = createBottomTabNavigator();
	const { device } = route.params;	
	const [ styles ] = useStyles();
	const IconComponent = useCallback(({ focused, icon }) => (<FontAwesomeIcon icon={icon} size={24} color={focused ? styles.colors.blue.primary : styles.fg}  />), [ styles ]);

	useEffect(() => {
		navigation.setOptions({
			headerLargeTitle: false,
			headerTitle: device.name
		})
	}, [ navigation, route ]);

	return (
		<DeviceInfoContext.Provider value={{ device }}>
			<TabNavigator.Navigator>
				<TabNavigator.Screen
					name="Properties"
					component={DevicePropertiesScreen}
					options={{
						tabBarShowLabel: false,
						headerShown: false,
						tabBarIcon: (props) => <IconComponent icon={faInfoCircle} {...props} />
					}}
				/>
				<TabNavigator.Screen
					name="Events"
					component={DeviceEventsScreen}
					options={{
						tabBarShowLabel: false,
						headerShown: false,
						tabBarIcon: (props) => <IconComponent icon={faExclamationTriangle} {...props} />
					}}
				/>
				<TabNavigator.Screen
					name="Commands"
					component={DeviceCommandsScreen}
					options={{
						tabBarShowLabel: false,
						headerShown: false,
						tabBarIcon: (props) => <IconComponent icon={faTerminal} {...props} />
					}}
				/>
			</TabNavigator.Navigator>
		</DeviceInfoContext.Provider>
	)
}