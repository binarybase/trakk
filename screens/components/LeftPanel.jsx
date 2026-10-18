import { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trigger } from 'react-native-haptic-feedback';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons/faMagnifyingGlass";
import { useDevicesContext } from "../../lib/context/devicesContext";
import { useAuthContext } from "../../lib/context/authContext";
import { countByState, DEVICE_STATE, filterDevices, STATE_COLORS } from "../../lib/deviceStatus";
import { pluralize } from "../../lib/formatter";
import { useStorage } from "../../lib/storage";
import { useStyles } from "../../style/useStyles";
import { DeviceItem } from "./DeviceItem";

// search only pays off for larger fleets
const SEARCH_FROM = 5;

const FILTERS = [
	[DEVICE_STATE.MOVING, 'V pohybu'],
	[DEVICE_STATE.PARKED, 'Stojí'],
	[DEVICE_STATE.NO_SIGNAL, 'Bez signálu'],
];

// moving first, then most recent fix
const sortFn = (a, b) => b.moving - a.moving || new Date(b.position.fixTime) - new Date(a.position.fixTime);
const keyExtractor = (d) => d.identifier;

const Chip = ({ label, count, color, active, onPress, styles }) => {
	const dotColor = active ? '#fff' : color;
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[styles.chip, active && styles.chipActive]}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
		>
			{!!color && <View style={[styles.chipDot, { backgroundColor: dotColor }]} />}
			<Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
			<Text style={[styles.chipCount, active && styles.chipTextActive]}>{count}</Text>
		</TouchableOpacity>
	);
};

export default function LeftPanel({ navigation }) {
	const insets = useSafeAreaInsets();
	const [styles] = useStyles(s => ({
		container: {
			flex: 1,
			backgroundColor: s.isDark ? s.bg : s.cardBg,
		},
		header: {
			paddingHorizontal: 16,
			paddingBottom: 8,
		},
		title: {
			fontSize: 30,
			fontWeight: '800',
			color: s.fg,
		},
		subtitle: {
			fontSize: 13,
			color: s.muted,
			marginTop: 2,
		},
		offline: {
			fontSize: 13,
			fontWeight: '600',
			color: s.colors.red,
			marginTop: 4,
		},
		search: {
			flexDirection: 'row',
			alignItems: 'center',
			height: 38,
			marginTop: 12,
			paddingHorizontal: 10,
			borderRadius: 12,
			backgroundColor: 'rgba(118,118,128,0.14)',
		},
		searchInput: {
			flex: 1,
			fontSize: 16,
			color: s.fg,
			marginLeft: 8,
			paddingVertical: 0,
		},
		chips: {
			paddingHorizontal: 16,
			paddingVertical: 10,
		},
		chip: {
			flexDirection: 'row',
			alignItems: 'center',
			height: 32,
			paddingHorizontal: 12,
			marginRight: 8,
			borderRadius: 16,
			backgroundColor: s.isDark ? s.cardBg : s.bg,
		},
		chipActive: {
			backgroundColor: s.colors.blue.primary,
		},
		chipDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
			marginRight: 6,
		},
		chipText: {
			fontSize: 14,
			fontWeight: '600',
			color: s.fg,
		},
		chipCount: {
			fontSize: 14,
			fontWeight: '500',
			color: s.muted,
			marginLeft: 5,
		},
		chipTextActive: {
			color: '#fff',
		},
		list: {
			paddingHorizontal: 12,
		},
		separator: {
			height: 8,
		},
		empty: {
			...s.text.note,
			textAlign: 'center',
			marginTop: 32,
			paddingHorizontal: 16,
		},
	}));

	const { devices, currentDevice, setCurrentDevice, setPinnedDevice } = useDevicesContext();
	const { online } = useAuthContext();
	const [blockedDevices, setBlockedDevices] = useStorage("blockedDevices", []);
	const [query, setQuery] = useState('');
	const [stateFilter, setStateFilter] = useState(null);

	const counts = useMemo(() => countByState(devices), [devices]);
	const visibleDevices = useMemo(
		() => filterDevices(devices, { query, state: stateFilter }).sort(sortFn),
		[devices, query, stateFilter]
	);

	const onItemPress = useCallback((d) => {
		trigger('selection');
		setCurrentDevice(d);
		setPinnedDevice(d);
		navigation.closeDrawer();
	}, [navigation, setCurrentDevice, setPinnedDevice]);

	const onInfoPress = useCallback((d) => {
		trigger('impactLight');
		navigation.navigate('DeviceInfoScreen', { deviceId: d.id });
	}, [navigation]);

	const renderItem = useCallback(({ item }) => (
		<DeviceItem
			device={item}
			selected={currentDevice?.id === item.id}
			isEngineBlocked={blockedDevices?.includes(item.id) === true}
			setBlockedDevices={setBlockedDevices}
			onPress={onItemPress}
			onInfoPress={onInfoPress}
		/>
	), [currentDevice?.id, blockedDevices, setBlockedDevices, onItemPress, onInfoPress]);

	const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles]);

	const emptyText = devices.length
		? 'Žádné vozidlo neodpovídá hledání.'
		: 'Žádná vozidla s polohou. Data se načítají, nebo účet nemá přiřazená zařízení.';

	return (
		<View style={[styles.container, { paddingTop: insets.top + 12 }]}>
			<View style={styles.header}>
				<Text style={styles.title}>Vozidla</Text>
				{devices.length > 0 && (
					<Text style={styles.subtitle}>
						{devices.length} {pluralize(devices.length, 'vozidlo', 'vozidla', 'vozidel')}
					</Text>
				)}
				{!online && <Text style={styles.offline}>Offline – zobrazuji poslední data</Text>}

				{devices.length >= SEARCH_FROM && (
					<View style={styles.search}>
						<FontAwesomeIcon icon={faMagnifyingGlass} size={14} color={styles.muted} />
						<TextInput
							style={styles.searchInput}
							value={query}
							onChangeText={setQuery}
							placeholder="Název, SPZ nebo IMEI"
							placeholderTextColor={styles.muted}
							autoCorrect={false}
							autoCapitalize="none"
							clearButtonMode="while-editing"
							returnKeyType="search"
						/>
					</View>
				)}
			</View>

			{devices.length > 0 && (
				<View>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
						<Chip
							label="Vše"
							count={devices.length}
							active={!stateFilter}
							onPress={() => setStateFilter(null)}
							styles={styles}
						/>
						{FILTERS
							.filter(([state]) => counts[state] || stateFilter === state)
							.map(([state, label]) => (
								<Chip
									key={state}
									label={label}
									count={counts[state] || 0}
									color={STATE_COLORS[state]}
									active={stateFilter === state}
									onPress={() => setStateFilter(stateFilter === state ? null : state)}
									styles={styles}
								/>
							))}
					</ScrollView>
				</View>
			)}

			<FlatList
				data={visibleDevices}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				ItemSeparatorComponent={renderSeparator}
				ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
				contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
			/>
		</View>
	);
}
