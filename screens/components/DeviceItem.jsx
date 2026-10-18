import { memo } from 'react';
import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faRoadBarrier } from "@fortawesome/free-solid-svg-icons/faRoadBarrier";
import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons/faUnlockKeyhole";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import { useStyles } from "../../style/useStyles";
import VehiclePuck from './VehiclePuck';
import VehicleMetrics from './VehicleMetrics';
import { deviceState, deviceStatusLabel, STATE_COLORS } from "../../lib/deviceStatus";
import { activityFormatter } from "../../lib/formatter";
import { alert, confirm, emptyAction } from '../../lib/alert';
import { post } from "../../lib/request";

// trackers that understand the RELAY command
const ENGINE_BLOCK_PROTOCOLS = ['gt06'];

const IconButton = ({ icon, color, onPress, label, styles }) => (
	<TouchableOpacity
		onPress={onPress}
		style={styles.iconButton}
		hitSlop={6}
		activeOpacity={0.6}
		accessibilityRole="button"
		accessibilityLabel={label}
	>
		<FontAwesomeIcon icon={icon} size={15} color={color} />
	</TouchableOpacity>
);

/**
 * vehicle row of the side panel
 */
export const DeviceItem = memo(({ device, selected, isEngineBlocked, setBlockedDevices, onPress, onInfoPress }) => {
	const [styles] = useStyles(s => ({
		row: {
			flexDirection: 'row',
			padding: 12,
			borderRadius: 18,
			backgroundColor: s.isDark ? s.cardBg : s.bg,
		},
		rowSelected: {
			backgroundColor: s.colors.blue.secondary,
			borderWidth: 1.5,
			borderColor: s.colors.blue.primary,
			padding: 10.5,
		},
		body: {
			flex: 1,
			marginLeft: 12,
		},
		titleRow: {
			flexDirection: 'row',
			alignItems: 'baseline',
		},
		name: {
			fontSize: 17,
			fontWeight: '600',
			color: s.fg,
			flexShrink: 1,
		},
		model: {
			fontSize: 13,
			fontWeight: '600',
			color: s.muted,
			marginLeft: 6,
			flexShrink: 1,
		},
		age: {
			fontSize: 13,
			color: s.muted,
			marginLeft: 'auto',
			paddingLeft: 8,
		},
		status: {
			fontSize: 14,
			fontWeight: '600',
			marginTop: 2,
		},
		address: {
			fontSize: 13,
			color: s.muted,
			marginTop: 2,
		},
		badge: {
			flexDirection: 'row',
			alignItems: 'center',
			alignSelf: 'flex-start',
			marginTop: 6,
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: 8,
			backgroundColor: 'rgba(255,59,48,0.14)',
		},
		badgeText: {
			fontSize: 12,
			fontWeight: '700',
			color: s.colors.red,
			marginLeft: 5,
		},
		footer: {
			flexDirection: 'row',
			alignItems: 'flex-end',
			marginTop: 6,
		},
		metrics: {
			flex: 1,
		},
		actions: {
			flexDirection: 'row',
			marginLeft: 8,
		},
		iconButton: {
			width: 32,
			height: 32,
			borderRadius: 16,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: s.listBg,
			marginLeft: 6,
		},
	}));

	const color = STATE_COLORS[deviceState(device)];
	const canBlockEngine = ENGINE_BLOCK_PROTOCOLS.includes(device.position?.protocol);

	const onEngineBlockPress = () => {
		confirm({
			title: isEngineBlocked ? 'Odblokování motoru' : 'Blokace motoru',
			message: `${device.name}: potvrďte prosím provedení akce`,
		}).then(() => {
			post('commands/send', {
				deviceId: device.id,
				id: 0,
				textChannel: false,
				type: 'custom',
				attributes: {
					data: `RELAY,${isEngineBlocked ? '0' : '1'}#`,
				},
			}).then(response => {
				if (response.status !== 200) {
					alert("Odeslání příkazu selhalo.");
					return;
				}

				alert("Příkaz byl odeslán!");
				setBlockedDevices(blocked => isEngineBlocked
					? blocked.filter(id => id !== device.id)
					: [...blocked, device.id]);
			});
		}).catch(emptyAction);
	};

	return (
		<TouchableOpacity
			onPress={() => onPress(device)}
			style={[styles.row, selected && styles.rowSelected]}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityState={{ selected: !!selected }}
		>
			<VehiclePuck device={device} size={38} />
			<View style={styles.body}>
				<View style={styles.titleRow}>
					<Text numberOfLines={1} style={styles.name}>{device.name}</Text>
					{!!device.model && <Text numberOfLines={1} style={styles.model}>{device.model}</Text>}
					{!!device.position?.fixTime && <Text style={styles.age}>{activityFormatter(device.position.fixTime, true)}</Text>}
				</View>
				<Text style={[styles.status, { color }]}>{deviceStatusLabel(device)}</Text>
				{!!device.position?.address && (
					<Text numberOfLines={1} style={styles.address}>{device.position.address}</Text>
				)}
				{isEngineBlocked && (
					<View style={styles.badge}>
						<FontAwesomeIcon icon={faLock} size={10} color={styles.colors.red} />
						<Text style={styles.badgeText}>Motor blokován</Text>
					</View>
				)}
				<View style={styles.footer}>
					<VehicleMetrics device={device} color={styles.fg} size={12} style={styles.metrics} />
					<View style={styles.actions}>
						{canBlockEngine && (
							<IconButton
								icon={isEngineBlocked ? faUnlockKeyhole : faRoadBarrier}
								color={styles.colors.red}
								onPress={onEngineBlockPress}
								label={isEngineBlocked ? 'Odblokovat motor' : 'Zablokovat motor'}
								styles={styles}
							/>
						)}
						<IconButton
							icon={faCircleInfo}
							color={styles.colors.blue.primary}
							onPress={() => onInfoPress(device)}
							label="Detail vozidla"
							styles={styles}
						/>
					</View>
				</View>
			</View>
		</TouchableOpacity>
	);
});
