import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { useHeaderHeight} from '@react-navigation/elements';

const keyExtractor = item => item.ts;

export default DeviceCommands = () => {
	const h = useHeaderHeight();
	const { device } = useContext(deviceInfoContext);
	const [ styles, theme ] = useStyles(s => ({
		view: {
			flex: 1,
			backgroundColor: s.fgInv,
			padding: 15
		},
		flatList: {
			
		},
		headerText: {
			color: s.colors.gray[theme]
		},
		itemHeader: {
			flexDirection: "row",
			justifyContent: "flex-end"
		},
		itemMessage: {
			...s.text.base,
			marginBottom: 10,
			textAlign: "left"
		}
	}));
	const [ commands, setCommands ] = useStorage(`cmds_${device.id}`, []);
	const [ value, setValue ] = useState();
	const [ error, setError ] = useState(false);

	// renderItem method
	const renderItem = useCallback(({ item }) => {
		return (
			<View>
				<View style={[styles.itemHeader, { justifyContent: item.type === 'sent' ? "flex-start" : "flex-end"}]} key={item.ts}>
					<Text style={styles.headerText}>{formatTime(item.ts)}</Text>
					<FontAwesomeIcon icon={item.type === 'sent' ? faArrowRight : faArrowLeft} size={16} color={item.type === 'sent' ? styles.colors.red : styles.colors.blue.primary} style={{ marginLeft: 10 }} />
				</View>
				<Text style={[styles.itemMessage, { textAlign: item.type === 'sent' ? "left" : "right"}]}>{item.value}</Text>
			</View>
		)
	}, [ theme ]);

	// sends command to api service
	const sendCommand = useCallback(() => {
		if(isEmpty(value))
			return;

		// reset input
		setValue();

		// send command to API
		post('commands/send', {
			deviceId: device.id,
			id: 0,
			textChannel: false,
			type: 'custom',
			attributes: {
				data: value
			}
		}).then(response => {
			if(response.status === 200){
				// append command to console
				setCommands(cmds => ([
					{
						ts: now(),
						type: 'sent',
						value
					},
					...cmds
				]))		
			} else {
				alert("Odeslání příkazu selhalo.");
			}
		})
	}, [ value, device ]);

	// construct hook to update
	useEffect(() => {
		if(!device) return;

		const params = (new URLSearchParams({
			deviceId: device.id,
			type: "commandResult"
		})).toString();

		const fetchCommands = async () => {
			const ts = now();
			const from = new Date(ts - (600 * 1000)).toISOString();
			const to = new Date(ts + (600 * 1000)).toISOString();
			// since urlsearchparams.set fn is not implemented
			// we have to construct query manually
			const query = `${params.toString()}&from=${from}&to=${to}`;

			try {
				const events = (await get(`reports/events?${query}`))?.data || [];
				// append
				// since traccar 5.X is eventTime insteadOf serverTime

				setCommands(cmds => {
					// filter out events that doesnt exists yet in list
					const eventsToAdd = events.filter(
						event => event.type == 'commandResult' &&
						!isEmpty(event.attributes?.result) &&
						cmds.findIndex(cmd => cmd.ts === +(new Date(event.serverTime || event.eventTime))) === -1
					).map(event => ({
						ts: +(new Date(event.serverTime || event.eventTime)),
						type: 'recv',
						value: event.attributes.result
					}));

					if(!eventsToAdd.length){
						return cmds;
					}

					return ([
						...eventsToAdd,
						...cmds
					]);
				});

				setError(false);
			} catch(ex){
				console.error("console exception", ex);
				setError(true);
			}
		}

		// set up command pooling
		const id = setInterval(fetchCommands, 10000);
		fetchCommands();
		return () => {
			clearInterval(id);
		}
	}, [ device ]);

	return (
		<View style={styles.view}>
			{error && <View><Text style={styles.text.base}>Nelze načíst konzoli pro zařízení {device.id}</Text></View>}
			<FlatList
				style={styles.flatList}
				data={commands}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				inverted={true}
			/>
			<KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={h}>
				<MessageBar value={value} setValue={setValue} onSubmit={sendCommand} />
			</KeyboardAvoidingView>
		</View>
	)
}