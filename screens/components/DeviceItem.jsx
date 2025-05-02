import { useStyles } from "../../style/useStyles";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons/faLocationDot";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { View, Text, TouchableOpacity } from "react-native";
import { COLOR_DRIVING, COLOR_STANDING } from "../../lib/constants";
import { activityFormatter, formatDistance, formatVoltage, formatSpeed } from "../../lib/formatter";
//import { faClock } from "@fortawesome/free-solid-svg-icons/faClock";
import { faRulerHorizontal } from "@fortawesome/free-solid-svg-icons/faRulerHorizontal";
import { faCarBattery } from "@fortawesome/free-solid-svg-icons/faCarBattery";
import { faRoadBarrier } from "@fortawesome/free-solid-svg-icons/faRoadBarrier";
import { faCloud } from "@fortawesome/free-solid-svg-icons/faCloud";
import { alert, confirm, emptyAction } from '../../lib/alert';
import { post } from "../../lib/request";
import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons/faUnlockKeyhole";
import { memo } from 'react';
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle";
//import { faCircleStop } from "@fortawesome/free-regular-svg-icons/faCircleStop";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { isBool } from "../../lib/util";

const ICON_SIZE = 12;

export const DeviceItem = memo(({ navigate, device, color, focused, isEngineBlocked, blockedDevices, setBlockedDevices }) => {
	const [ styles ]= useStyles(s => ({
		view: {
			paddingLeft: 16,
			paddingRight: 16,
			paddingTop: 10,
			paddingBottom: 12,
			borderBottomWidth: 1,
			borderBottomColor: 'rgba(255,255,255,0.1)'
		},
		deviceHeading: {
			flexDirection: 'row',
			justifyContent: "flex-start",
			alignItems: "flex-start"
		},
		deviceDetail: {
			flexDirection: 'row',
			alignItems: "center",
			marginBottom: 8
		},
		deviceStatusIcon: {
			marginRight: 4,
			marginTop: 1
		},
		deviceSpeedValue: {
			color: "white"
		},
		deviceDetailTitle: {
			fontSize: 16,
			fontWeight: 700,
			color: s.fg,
			marginBottom: 8
		},
		deviceDetailText: {
			fontSize: 13,
			color: s.fg,
			marginLeft: 8
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: "space-between",
			marginBottom: 10
		},
		actions: {
			flexDirection: 'row',
			justifyContent: 'flex-end',
			borderRadius: 10,
			//backgroundColor: "red"
		},
		actionButton: {
			height: 32,
			minWidth: 32,
			//backgroundColor: "red",
			justifyContent: "center",
			alignItems: "center",
			marginLeft: 1
		},
		actionButtonLabel: {
			color: s.fg,
			marginRight: 5
		}
	}));

	const canBlockEngine = device.position?.protocol === 'gt06';
	const isMoving = device.moving;
	const TEXT_COLOR = device.moving ? COLOR_DRIVING : COLOR_STANDING;
	const odometer = device.position?.attributes?.odometer * 1000 || device.position?.attributes?.totalDistance;
	const ignition = device.position?.attributes?.ignition;

	const onDeviceEventsPress = () => {
		navigate && navigate("DeviceEventsScreen", { device });
	}

	const onDeviceInfoPress = () => {
		navigate && navigate("DeviceInfoScreen", { device });
	}

	const onEngineBlockPress = () => {
		if(!canBlockEngine) return;
		confirm({
			title: isEngineBlocked ? 'Odblokování motoru' : 'Blokace motoru',
			message: 'Potvrďte prosím provedení akce'
		}).then(() => {
			post('commands/send', {
				deviceId: device.id,
				id: 0,
				textChannel: false,
				type: 'custom',
				attributes: {
					data: `RELAY,${isEngineBlocked ? '0' : '1'}#`
				}
			}).then(response => {
				if(response.status === 200){
					alert("Příkaz byl odeslán!");
					console.log("command", response);
				} else {
					alert("Odeslání příkazu selhalo.");
				}

				if(isEngineBlocked){
					setBlockedDevices(blockedDevices.filter(d => d !== device.id));
				} else {
					setBlockedDevices([...blockedDevices, device.id]);
				}
			})
		}).catch(emptyAction);
	}

	return (
		<View style={styles.view}>
			<View style={styles.header}>
				<View style={{flexDirection: "column", gap: 8}}>
					<View style={styles.deviceHeading}>
						{<FontAwesomeIcon icon={ isMoving ? faArrowRight : faPause} color={TEXT_COLOR} style={styles.deviceStatusIcon} />}
						<Text style={{...styles.deviceSpeedValue, color: TEXT_COLOR}}>
							{device.moving ? formatSpeed(device.position.speed) : activityFormatter(device.position.fixTime, true)}
						</Text>
					</View>
					<Text
						numberOfLines={1}
						style={styles.deviceDetailTitle}
					>
							{device.name}
					</Text>
				</View>

				<View style={styles.actions}>
					{canBlockEngine && (<TouchableOpacity onPress={onEngineBlockPress} style={[styles.actionButton, !canBlockEngine ? styles.btn.disabled : null]} disabled={!canBlockEngine}>
						{isEngineBlocked && <Text style={styles.actionButtonLabel}>Odblokovat</Text>}
						<FontAwesomeIcon icon={isEngineBlocked ? faUnlockKeyhole : faRoadBarrier} size={16} color={styles.fg} />
					</TouchableOpacity>)}
					<TouchableOpacity onPress={onDeviceInfoPress} style={styles.actionButton}>
						<FontAwesomeIcon icon={faInfoCircle} size={16} color={styles.fg} />
					</TouchableOpacity>
				</View>
			</View>
			<View>
				
				{device.position.address && (
					<View style={styles.deviceDetail}>
						<FontAwesomeIcon icon={faLocationDot} color={styles.fg} size={ICON_SIZE} />
						<Text numberOfLines={1} style={styles.deviceDetailText}>{device.position.address ?? '< není poloha >'}</Text>
					</View>
				)}

				{(odometer > 0) && (
					<View style={styles.deviceDetail}>
						<FontAwesomeIcon icon={faRulerHorizontal} color={styles.fg} size={ICON_SIZE} />
						<Text numberOfLines={1} style={styles.deviceDetailText}>{formatDistance(odometer)}</Text>
					</View>
				)}

				{device.position?.attributes?.power && (
					<View style={styles.deviceDetail}>
						<FontAwesomeIcon icon={faCarBattery} color={styles.fg} size={ICON_SIZE} />
						<Text numberOfLines={1} style={styles.deviceDetailText}>{formatVoltage(device.position.attributes.power)}</Text>
					</View>
				)}
				{device.status && (
					<View style={styles.deviceDetail}>
						<FontAwesomeIcon icon={faCloud} color={styles.fg} size={ICON_SIZE} />
						<Text numberOfLines={1} style={styles.deviceDetailText}>aktivní {activityFormatter(device.lastUpdate)}</Text>
					</View>
				)}
				{isBool(ignition) && (
					<View style={styles.deviceDetail}>
						<FontAwesomeIcon icon={faGear} color={styles.fg} size={ICON_SIZE} />
						<Text numberOfLines={1} style={styles.deviceDetailText}>{ignition === true ? 'zapnuto' : 'vypnuto'}</Text>
					</View>
				)}
			</View>
		</View>
	)
})