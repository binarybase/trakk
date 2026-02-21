import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useDevicesContext } from "../../lib/context/devicesContext";
import { DeviceItem } from "./DeviceItem";
import { TouchableOpacity, View, useColorScheme } from "react-native";
import { useStorage } from "../../lib/storage";
import { useCallback } from "react";
import { trigger } from 'react-native-haptic-feedback';
import { useStyles } from "../../style/useStyles";

const sortFn = (a, b) => b.moving - a.moving || (new Date(b.position.fixTime)) - new Date(a.position.fixTime);

export default ({ navigation }) => {
	const [styles] = useStyles(s => ({
		itemContainer: {
			borderBottomWidth: 0.5,
			borderBottomColor: s.separator,
		},
		selectedItem: {
			backgroundColor: s.colors.blue.secondary,
		},
		blockedItem: {
			backgroundColor: 'rgba(255,59,48,0.08)',
		},
	}));

	const navigate = useCallback((screen, opts) => {
		trigger('impactLight');
		navigation.navigate(screen, opts);
	}, [navigation]);

	const { devices, currentDevice, setCurrentDevice, setPinnedDevice } = useDevicesContext();
	const [blockedDevices, setBlockedDevices] = useStorage("blockedDevices", []);

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
				const isSelected = currentDevice?.id === d.id;

				return (
					<TouchableOpacity
						key={d.identifier}
						onPress={() => onItemPress(d)}
						style={[
							styles.itemContainer,
							isEngineBlocked && styles.blockedItem,
							isSelected && styles.selectedItem,
						]}
						activeOpacity={0.6}
					>
						<DeviceItem
							device={d}
							isEngineBlocked={isEngineBlocked}
							blockedDevices={blockedDevices}
							setBlockedDevices={setBlockedDevices}
							navigate={navigate}
						/>
					</TouchableOpacity>
				);
			})}
		</DrawerContentScrollView>
	);
};
