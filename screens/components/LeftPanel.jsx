import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useDevicesContext } from "../../lib/context/devicesContext";
import { DeviceItem } from "./DeviceItem";
import { TouchableOpacity, useColorScheme } from "react-native";
import { useStorage } from "../../lib/storage";
import { useCallback } from "react";
import { trigger } from 'react-native-haptic-feedback';

const sortFn = (a, b) => b.moving - a.moving || (new Date(b.position.fixTime)) - new Date(a.position.fixTime);

export default ({ navigation }) => {
	/**
	 * navigate fn with haptic feedback
	 */
	const navigate = useCallback((screen, opts) => {
		trigger('impactLight');
		navigation.navigate(screen, opts);
	}, [ navigation ]);

	// state
	const { devices, currentDevice, setCurrentDevice, setPinnedDevice } = useDevicesContext();
	const [ blockedDevices, setBlockedDevices ] = useStorage("blockedDevices", []);
	const theme = useColorScheme();
	const colorBase = theme === 'dark' ? '0,0,0' : '255,255,255';

	// item press handler
	const onItemPress = useCallback((d) => {
		trigger('selection');
		setCurrentDevice(d);
		setPinnedDevice(d);
		navigation.closeDrawer();
	}, []);

	return (
		<DrawerContentScrollView>
			{devices?.sort(sortFn).map(d => {
				const isEngineBlocked = blockedDevices?.includes(d.id) === true;
				const backgroundColor = isEngineBlocked ? "rgba(255,0,0,0.1)" : currentDevice?.id === d.id ? `rgba(${colorBase},0.4)` : `rgba(${colorBase},0.2)`;

				return (
					<TouchableOpacity key={d.identifier} onPress={() => onItemPress(d)} style={{ backgroundColor }}>
						<DeviceItem
							device={d}
							isEngineBlocked={isEngineBlocked}
							blockedDevices={blockedDevices}
							setBlockedDevices={setBlockedDevices}
							navigate={navigate}
						/>
					</TouchableOpacity>
				)
			})}
		</DrawerContentScrollView>
	)
}