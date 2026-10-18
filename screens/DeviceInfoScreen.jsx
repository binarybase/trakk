import { useStyles } from '../style/useStyles';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DevicePropertiesScreen from './DevicePropertiesScreen';
import DeviceEventsScreen from './DeviceEventsScreen';
import DeviceCommandsScreen from './DeviceCommandsScreen';
import DeviceInfoContext from '../lib/context/deviceInfoContext';
import { useDevice } from '../lib/context/devicesContext';
import { faInfoCircle, faExclamationTriangle, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

const TabNavigator = createBottomTabNavigator();

const tabIcon = (icon) => ({ color }) => <FontAwesomeIcon icon={icon} size={24} color={color} />;
const PROPERTIES_OPTIONS = { tabBarIcon: tabIcon(faInfoCircle), tabBarAccessibilityLabel: 'Informace' };
const EVENTS_OPTIONS = { tabBarIcon: tabIcon(faExclamationTriangle), tabBarAccessibilityLabel: 'Události' };
const COMMANDS_OPTIONS = { tabBarIcon: tabIcon(faTerminal), tabBarAccessibilityLabel: 'Konzole' };

export default function DeviceInfoScreen({ navigation, route }) {
	const { deviceId } = route.params;
	const [styles] = useStyles();

	// live device; keep showing the last known copy if it disappears
	const liveDevice = useDevice(deviceId);
	const lastDeviceRef = useRef(liveDevice);
	if (liveDevice) {
		lastDeviceRef.current = liveDevice;
	}
	const device = liveDevice || lastDeviceRef.current;

	useLayoutEffect(() => {
		navigation.setOptions({
			headerLargeTitle: false,
			headerTitle: device?.name ?? '',
		});
	}, [navigation, device?.name]);

	const screenOptions = useMemo(() => ({
		tabBarShowLabel: false,
		headerShown: false,
		tabBarActiveTintColor: styles.colors.blue.primary,
		tabBarInactiveTintColor: styles.fg,
	}), [styles]);

	if (!device) {
		return null;
	}

	return (
		<DeviceInfoContext.Provider value={device}>
			<TabNavigator.Navigator screenOptions={screenOptions}>
				<TabNavigator.Screen name="Properties" component={DevicePropertiesScreen} options={PROPERTIES_OPTIONS} />
				<TabNavigator.Screen name="Events" component={DeviceEventsScreen} options={EVENTS_OPTIONS} />
				<TabNavigator.Screen name="Commands" component={DeviceCommandsScreen} options={COMMANDS_OPTIONS} />
			</TabNavigator.Navigator>
		</DeviceInfoContext.Provider>
	);
}
