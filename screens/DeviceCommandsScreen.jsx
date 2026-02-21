import { useCallback, useContext, useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Text, View } from "react-native";
import { useStyles } from "../style/useStyles";
import MessageBar from "./components/MessageBar";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useStorage } from "../lib/storage";
import deviceInfoContext from "../lib/context/deviceInfoContext";
import { formatTime, now } from "../lib/date";
import { isEmpty } from "../lib/util";
import { alert } from "../lib/alert";
import { get, post } from "../lib/request";
import { useHeaderHeight } from '@react-navigation/elements';

const keyExtractor = item => item.ts;

export default DeviceCommands = () => {
	const h = useHeaderHeight();
	const { device } = useContext(deviceInfoContext);
	const [styles, theme] = useStyles(s => ({
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

	const [commands, setCommands] = useStorage(`cmds_${device.id}`, []);
	const [value, setValue] = useState();
	const [error, setError] = useState(false);

	const renderItem = useCallback(({ item }) => {
		const isSent = item.type === 'sent';
		return (
			<View style={styles.msgContainer}>
				<View style={[styles.msgHeader, { justifyContent: isSent ? 'flex-start' : 'flex-end' }]}>
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
	}, [theme]);

	const sendCommand = useCallback(() => {
		if (isEmpty(value)) return;

		setValue();

		post('commands/send', {
			deviceId: device.id,
			id: 0,
			textChannel: false,
			type: 'custom',
			attributes: { data: value },
		}).then(response => {
			if (response.status === 200) {
				setCommands(cmds => ([
					{
						ts: now(),
						type: 'sent',
						value,
					},
					...cmds,
				]));
			} else {
				alert("Odeslání příkazu selhalo.");
			}
		});
	}, [value, device]);

	useEffect(() => {
		if (!device) return;

		const params = (new URLSearchParams({
			deviceId: device.id,
			type: "commandResult",
		})).toString();

		const fetchCommands = async () => {
			const ts = now();
			const from = new Date(ts - 600 * 1000).toISOString();
			const to = new Date(ts + 600 * 1000).toISOString();
			const query = `${params}&from=${from}&to=${to}`;

			try {
				const events = (await get(`reports/events?${query}`))?.data || [];

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

					return eventsToAdd.length ? [...eventsToAdd, ...cmds] : cmds;
				});

				setError(false);
			} catch (ex) {
				console.error("console exception", ex);
				setError(true);
			}
		};

		const id = setInterval(fetchCommands, 10000);
		fetchCommands();
		return () => clearInterval(id);
	}, [device]);

	return (
		<View style={styles.view}>
			{error && (
				<View style={styles.errorBanner}>
					<Text style={styles.errorText}>Nelze načíst konzoli pro zařízení {device.id}</Text>
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
};
