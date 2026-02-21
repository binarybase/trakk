import { useStyles } from "../../style/useStyles";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons/faLocationDot";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { View, Text, TouchableOpacity } from "react-native";
import { COLOR_DRIVING, COLOR_STANDING } from "../../lib/constants";
import { activityFormatter, formatDistance, formatVoltage, formatSpeed } from "../../lib/formatter";
import { faRulerHorizontal } from "@fortawesome/free-solid-svg-icons/faRulerHorizontal";
import { faCarBattery } from "@fortawesome/free-solid-svg-icons/faCarBattery";
import { faRoadBarrier } from "@fortawesome/free-solid-svg-icons/faRoadBarrier";
import { faCloud } from "@fortawesome/free-solid-svg-icons/faCloud";
import { alert, confirm, emptyAction } from '../../lib/alert';
import { post } from "../../lib/request";
import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons/faUnlockKeyhole";
import { memo } from 'react';
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { isBool } from "../../lib/util";

const ICON_SIZE = 13;

export const DeviceItem = memo(({ navigate, device, color, focused, isEngineBlocked, blockedDevices, setBlockedDevices }) => {
	const [styles] = useStyles(s => ({
		container: {
			paddingHorizontal: 16,
			paddingVertical: 14,
		},
		header: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			justifyContent: 'space-between',
			marginBottom: 10,
		},
		nameColumn: {
			flexDirection: 'column',
			gap: 4,
			flex: 1,
			marginRight: 8,
		},
		statusRow: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		statusIcon: {
			marginRight: 6,
		},
		statusText: {
			fontSize: 13,
			fontWeight: '600',
		},
		deviceName: {
			fontSize: 17,
			fontWeight: '600',
			color: s.fg,
		},
		detailRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 6,
		},
		detailText: {
			fontSize: 13,
			color: s.colors.gray[s.colors.base.dark === s.fg ? 'dark' : 'light'],
			marginLeft: 8,
		},
		actions: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		actionBtn: {
			height: 34,
			width: 34,
			borderRadius: 10,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: s.colors.opacity01[s.colors.base.dark === s.fg ? 'dark' : 'light'],
			marginLeft: 6,
		},
		blockLabel: {
			color: s.fg,
			fontSize: 12,
			fontWeight: '500',
			marginRight: 4,
		},
	}));

	const canBlockEngine = device.position?.protocol === 'gt06';
	const isMoving = device.moving;
	const TEXT_COLOR = isMoving ? COLOR_DRIVING : COLOR_STANDING;
	const odometer = device.position?.attributes?.odometer * 1000 || device.position?.attributes?.totalDistance;
	const ignition = device.position?.attributes?.ignition;

	const onDeviceInfoPress = () => {
		navigate && navigate("DeviceInfoScreen", { device });
	};

	const onEngineBlockPress = () => {
		if (!canBlockEngine) return;
		confirm({
			title: isEngineBlocked ? 'Odblokování motoru' : 'Blokace motoru',
			message: 'Potvrďte prosím provedení akce',
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
				if (response.status === 200) {
					alert("Příkaz byl odeslán!");
				} else {
					alert("Odeslání příkazu selhalo.");
				}

				if (isEngineBlocked) {
					setBlockedDevices(blockedDevices.filter(d => d !== device.id));
				} else {
					setBlockedDevices([...blockedDevices, device.id]);
				}
			});
		}).catch(emptyAction);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.nameColumn}>
					<View style={styles.statusRow}>
						<FontAwesomeIcon
							icon={isMoving ? faArrowRight : faPause}
							color={TEXT_COLOR}
							size={12}
							style={styles.statusIcon}
						/>
						<Text style={[styles.statusText, { color: TEXT_COLOR }]}>
							{isMoving ? formatSpeed(device.position.speed) : activityFormatter(device.position.fixTime, true)}
						</Text>
					</View>
					<Text numberOfLines={1} style={styles.deviceName}>
						{device.name}
					</Text>
				</View>

				<View style={styles.actions}>
					{canBlockEngine && (
						<TouchableOpacity onPress={onEngineBlockPress} style={styles.actionBtn} activeOpacity={0.6}>
							{isEngineBlocked && <Text style={styles.blockLabel}>Odblokovat</Text>}
							<FontAwesomeIcon icon={isEngineBlocked ? faUnlockKeyhole : faRoadBarrier} size={15} color={styles.fg} />
						</TouchableOpacity>
					)}
					<TouchableOpacity onPress={onDeviceInfoPress} style={styles.actionBtn} activeOpacity={0.6}>
						<FontAwesomeIcon icon={faInfoCircle} size={15} color={styles.fg} />
					</TouchableOpacity>
				</View>
			</View>

			{device.position?.address && (
				<View style={styles.detailRow}>
					<FontAwesomeIcon icon={faLocationDot} color={styles.fg} size={ICON_SIZE} />
					<Text numberOfLines={1} style={styles.detailText}>{device.position.address}</Text>
				</View>
			)}

			{odometer > 0 && (
				<View style={styles.detailRow}>
					<FontAwesomeIcon icon={faRulerHorizontal} color={styles.fg} size={ICON_SIZE} />
					<Text numberOfLines={1} style={styles.detailText}>{formatDistance(odometer)}</Text>
				</View>
			)}

			{device.position?.attributes?.power && (
				<View style={styles.detailRow}>
					<FontAwesomeIcon icon={faCarBattery} color={styles.fg} size={ICON_SIZE} />
					<Text numberOfLines={1} style={styles.detailText}>{formatVoltage(device.position.attributes.power)}</Text>
				</View>
			)}

			{device.status && (
				<View style={styles.detailRow}>
					<FontAwesomeIcon icon={faCloud} color={styles.fg} size={ICON_SIZE} />
					<Text numberOfLines={1} style={styles.detailText}>aktivní {activityFormatter(device.lastUpdate)}</Text>
				</View>
			)}

			{isBool(ignition) && (
				<View style={styles.detailRow}>
					<FontAwesomeIcon icon={faGear} color={styles.fg} size={ICON_SIZE} />
					<Text numberOfLines={1} style={styles.detailText}>{ignition === true ? 'zapnuto' : 'vypnuto'}</Text>
				</View>
			)}
		</View>
	);
});
