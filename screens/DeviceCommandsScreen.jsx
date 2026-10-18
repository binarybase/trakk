import { useCallback, useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Text, View } from "react-native";
import { useStyles } from "../style/useStyles";
import MessageBar from "./components/MessageBar";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useStorage } from "../lib/storage";
import { useDeviceInfo } from "../lib/context/deviceInfoContext";
import { formatTime, now } from "../lib/date";
import { isEmpty } from "../lib/util";
import { alert } from "../lib/alert";
import { get, post } from "../lib/request";
import { error as logError } from "../lib/logger";
import { useHeaderHeight } from '@react-navigation/elements';

const keyExtractor = item => String(item.ts);
// console history kept per device
const MAX_HISTORY = 100;

export default function DeviceCommandsScreen() {
	const h = useHeaderHeight();
	const device = useDeviceInfo();
	const deviceId = device.id;
	const [styles] = useStyles(s => ({
		view: {
			flex: 1,
			backgroundColor: s.bg,
		},
		flatList: {
			flex: 1,
			paddingHorizontal: 16,
		},
		errorBanner: {
			paddingVertical: 10,
			paddingHorizontal: 16,
			backgroundColor: 'rgba(255,59,48,0.1)',
		},
		errorText: {
			...s.text.caption,
			color: s.colors.red,
			textAlign: 'center',
		},
		msgContainer: {
			marginVertical: 4,
		},
		msgHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 4,
		},
		msgHeaderSent: {
			justifyContent: 'flex-start',
		},
		msgHeaderRecv: {
			justifyContent: 'flex-end',
		},
		msgTime: {
			...s.text.caption,
		},
		msgIcon: {
			marginLeft: 8,
		},
		msgBubbleSent: {
			backgroundColor: s.colors.blue.secondary,
			borderRadius: 12,
			borderTopLeftRadius: 4,
			paddingHorizontal: 14,
			paddingVertical: 10,
			alignSelf: 'flex-start',
			maxWidth: '85%',
		},
		msgBubbleRecv: {
			backgroundColor: s.cardBg,
			borderRadius: 12,
			borderTopRightRadius: 4,
			paddingHorizontal: 14,
			paddingVertical: 10,
			alignSelf: 'flex-end',
			maxWidth: '85%',
		},
		msgText: {
			...s.text.base,
			fontSize: 14,
		},
	}));

	const [commands, setCommands] = useStorage(`cmds_${deviceId}`, []);
	const [value, setValue] = useState();
	const [error, setError] = useState(false);

	const renderItem = useCallback(({ item }) => {
		const isSent = item.type === 'sent';
		return (
			<View style={styles.msgContainer}>
				<View style={[styles.msgHeader, isSent ? styles.msgHeaderSent : styles.msgHeaderRecv]}>
					<Text style={styles.msgTime}>{formatTime(item.ts)}</Text>
					<FontAwesomeIcon
						icon={isSent ? faArrowRight : faArrowLeft}
						size={12}
						color={isSent ? styles.colors.red : styles.colors.blue.primary}
						style={styles.msgIcon}
					/>
				</View>
				<View style={isSent ? styles.msgBubbleSent : styles.msgBubbleRecv}>
					<Text style={styles.msgText}>{item.value}</Text>
				</View>
			</View>
		);
	}, [styles]);

	const sendCommand = useCallback(() => {
		if (isEmpty(value)) return;

		post('commands/send', {
			deviceId,
			id: 0,
			textChannel: false,
			type: 'custom',
			attributes: { data: value },
		}).then(response => {
			if (response.status === 200) {
				// clear the input only once sent, a failed command can be retried
				setValue();
				setCommands(cmds => ([
					{
						ts: now(),
						type: 'sent',
						value,
					},
					...cmds,
				].slice(0, MAX_HISTORY)));
			} else {
				alert("Odeslání příkazu selhalo.");
			}
		});
	}, [value, deviceId, setCommands]);

	useEffect(() => {
		const params = (new URLSearchParams({
			deviceId,
			type: "commandResult",
		})).toString();

		const fetchCommands = async () => {
			const ts = now();
			const from = new Date(ts - 600 * 1000).toISOString();
			const to = new Date(ts + 600 * 1000).toISOString();
			const query = `${params}&from=${from}&to=${to}`;

			try {
				const response = await get(`reports/events?${query}`);
				if (response.status !== 200) {
					setError(true);
					return;
				}
				const events = response.data || [];

				setCommands(cmds => {
					const eventsToAdd = events
						.filter(
							event =>
								event.type === 'commandResult' &&
								!isEmpty(event.attributes?.result) &&
								cmds.findIndex(cmd => cmd.ts === +(new Date(event.serverTime || event.eventTime))) === -1
						)
						.map(event => ({
							ts: +(new Date(event.serverTime || event.eventTime)),
							type: 'recv',
							value: event.attributes.result,
						}));

					return eventsToAdd.length ? [...eventsToAdd, ...cmds].slice(0, MAX_HISTORY) : cmds;
				});

				setError(false);
			} catch (ex) {
				logError('DeviceCommands', 'fetching command results failed', ex);
				setError(true);
			}
		};

		const id = setInterval(fetchCommands, 10000);
		fetchCommands();
		return () => clearInterval(id);
	}, [deviceId, setCommands]);

	return (
		<View style={styles.view}>
			{error && (
				<View style={styles.errorBanner}>
					<Text style={styles.errorText}>Nelze načíst odpovědi zařízení</Text>
				</View>
			)}
			<FlatList
				style={styles.flatList}
				data={commands}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				inverted
			/>
			<KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={h}>
				<MessageBar value={value} setValue={setValue} onSubmit={sendCommand} />
			</KeyboardAvoidingView>
		</View>
	);
}
