import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerToggleButton } from '@react-navigation/drawer';
import LocationScreen from './LocationScreen';
import TripsScreen from './TripsScreen';
import StopsScreen from './StopsScreen';
import SettingsScreen from './SettingsScreen';
import LeftPanel from './components/LeftPanel';
import HeaderTitle from './components/HeaderTitle';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMap } from '@fortawesome/free-solid-svg-icons/faMap';
import { faRoute } from '@fortawesome/free-solid-svg-icons/faRoute';
import { faSquareParking } from '@fortawesome/free-solid-svg-icons/faSquareParking';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useStyles } from '../style/useStyles';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const tabIcon = (icon) => ({ color }) => <FontAwesomeIcon icon={icon} size={22} color={color} />;
const renderHeaderTitle = (props) => <HeaderTitle {...props} />;
const renderDrawerToggle = (props) => <DrawerToggleButton {...props} />;
const renderDrawerContent = (props) => <LeftPanel {...props} />;

// the map is full screen with floating controls
const MAP_OPTIONS = { headerShown: false, tabBarIcon: tabIcon(faMap), tabBarAccessibilityLabel: 'Mapa' };
const TRIPS_OPTIONS = { title: 'Trasy', tabBarIcon: tabIcon(faRoute), tabBarAccessibilityLabel: 'Trasy' };
const STOPS_OPTIONS = { title: 'Zastávky', tabBarIcon: tabIcon(faSquareParking), tabBarAccessibilityLabel: 'Zastávky' };
// settings don't depend on the selected vehicle, so there is no drawer toggle
const SETTINGS_OPTIONS = { title: 'Nastavení', headerLeft: () => null, tabBarIcon: tabIcon(faGear), tabBarAccessibilityLabel: 'Nastavení' };

const DRAWER_OPTIONS = { headerShown: false, swipeEnabled: true };
const DRAWER_RADIUS = 28;
// phone-like width on tablets; phones stay at 86% (≤ ~370pt)
const DRAWER_MAX_WIDTH = 380;

/**
 * each tab owns its header; report tabs add the vehicle name and their buttons
 */
const TabNavigator = () => {
	const [styles] = useStyles();
	const screenOptions = useMemo(() => ({
		headerTitle: renderHeaderTitle,
		headerLeft: renderDrawerToggle,
		headerTransparent: true,
		headerBackgroundContainerStyle: {
			backgroundColor: styles.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
		},
		tabBarShowLabel: false,
		tabBarActiveTintColor: styles.colors.blue.primary,
		tabBarInactiveTintColor: styles.muted,
	}), [styles]);

	return (
		<Tab.Navigator screenOptions={screenOptions}>
			<Tab.Screen name="Mapa" component={LocationScreen} options={MAP_OPTIONS} />
			<Tab.Screen name="Trasy" component={TripsScreen} options={TRIPS_OPTIONS} />
			<Tab.Screen name="Zastávky" component={StopsScreen} options={STOPS_OPTIONS} />
			<Tab.Screen name="Nastavení" component={SettingsScreen} options={SETTINGS_OPTIONS} />
		</Tab.Navigator>
	);
};

export default function HomeScreen() {
	const [styles] = useStyles();
	const { width } = useWindowDimensions();
	const screenOptions = useMemo(() => ({
		drawerType: 'front',
		overlayColor: 'rgba(0,0,0,0.3)',
		drawerStyle: {
			width: Math.min(width * 0.86, DRAWER_MAX_WIDTH),
			backgroundColor: styles.isDark ? styles.bg : styles.cardBg,
			borderTopRightRadius: DRAWER_RADIUS,
			borderBottomRightRadius: DRAWER_RADIUS,
			overflow: 'hidden',
		},
	}), [styles, width]);

	return (
		<Drawer.Navigator drawerContent={renderDrawerContent} screenOptions={screenOptions}>
			<Drawer.Screen name="Trakk" component={TabNavigator} options={DRAWER_OPTIONS} />
		</Drawer.Navigator>
	);
}
