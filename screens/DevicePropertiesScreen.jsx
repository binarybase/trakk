import { useStyles } from '../style/useStyles';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { useContext, useEffect } from 'react';
import { formatDateTime } from '../lib/date';
import { isBool } from '../lib/util';
import { useDeviceProperty } from '../lib/hooks/useDeviceProperty';
import DeviceInfoContext from '../lib/context/deviceInfoContext';
import { formatProperty, formatSpeed } from '../lib/formatter';

export default DevicePropertiesScreen = ({ navigation, route }) => {
	const { device } = useContext(DeviceInfoContext);
	const [ styles ]= useStyles(s => ({
		view: {
			flex: 1
		},
		ul: {
			...s.list.margin,
			...s.list.inset
		},
		li: {
			...s.list.list,
			marginBottom: 10,
			flexDirection: 'row',
			justifyContent: 'space-between'
		},
		propText: {
			...s.text.base
		},
		valueText: {
			...s.text.base,
			fontWeight: 'bold',
			minWidth: 150,
			textAlign: 'right',
			borderBottomWidth: 1
		},
		editable: {
			...s.input.text,
			width: '100%',
			marginBottom: 0
		}
	}));

	const ignition = device.position?.attributes?.ignition;

	// properties that can be changed via API
	const [ name, setName ] = useDeviceProperty(device, "name");
	const [ model, setModel ] = useDeviceProperty(device, "model");
	const [ phone, setPhone ] = useDeviceProperty(device, "phone");

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.ul}>
				<View style={styles.li}>
					<TextInput style={styles.editable} value={name} onChangeText={setName} autoFocus={true} />
				</View>
				<View style={styles.li}>
					<TextInput style={styles.editable} value={model} placeholder={"SPZ"} onChangeText={setModel} />
				</View>
				<View style={styles.li}>
					<TextInput style={styles.editable} value={phone} placeholder={"Tel. číslo"} onChangeText={setPhone} />
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>Stav</Text>
					<Text style={styles.valueText}>{device.status}</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>Stav zapalování</Text>
					<Text style={styles.valueText}>{ isBool(ignition) ? (ignition === true ? 'zapnuto' : 'vypnuto') : 'N/A' }</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>Poslední aktualizace</Text>
					<Text style={styles.valueText}>{formatDateTime(device.lastUpdate)}</Text>
				</View>
				<View style={[styles.li, { flexDirection: 'column' }]}>
					<Text style={styles.propText}>Poslední poloha</Text>
					<Text style={styles.valueText}>{device.position?.address ?? 'Není známa'}</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>Nadmořská výška</Text>
					<Text style={styles.valueText}>{device.position?.altitude ?? ''}</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>Směr</Text>
					<Text style={styles.valueText}>{device.position?.course ?? ''}</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>GPS latitude</Text>
					<Text style={styles.valueText}>{device.position?.latitude ?? ''}</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>GPS longitude</Text>
					<Text style={styles.valueText}>{device.position?.longitude ?? ''}</Text>
				</View>
				<View style={styles.li}>
					<Text style={styles.propText}>Rychlost</Text>
					<Text style={styles.valueText}>{formatSpeed(device.position?.speed || 0)}</Text>
				</View>
				{Object.keys(device.position?.attributes || {}).map((k, index) => (
					<View style={styles.li} key={index}>
						<Text style={styles.propText}>{k}</Text>
						<Text style={styles.valueText}>{formatProperty(k, device.position.attributes[k])}</Text>
					</View>
				))}
			</View>
		</ScrollView>
	)
}