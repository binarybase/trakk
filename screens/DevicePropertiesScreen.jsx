import { useStyles } from '../style/useStyles';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { useContext } from 'react';
import { formatDateTime } from '../lib/date';
import { isBool } from '../lib/util';
import { useDeviceProperty } from '../lib/hooks/useDeviceProperty';
import DeviceInfoContext from '../lib/context/deviceInfoContext';
import { formatProperty, formatSpeed } from '../lib/formatter';

export default DevicePropertiesScreen = () => {
	const { device } = useContext(DeviceInfoContext);
	const [styles] = useStyles(s => ({
		view: {
			flex: 1,
		},
		section: {
			marginTop: 20,
			marginHorizontal: 16,
		},
		sectionHeader: {
			...s.list.header,
			paddingHorizontal: 4,
			marginBottom: 8,
		},
		card: {
			backgroundColor: s.cardBg,
			borderRadius: 14,
			overflow: 'hidden',
			marginBottom: 16,
		},
		row: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		rowSeparator: {
			height: 0.5,
			backgroundColor: s.separator,
			marginLeft: 16,
		},
		propText: {
			...s.text.base,
			flex: 1,
		},
		valueText: {
			...s.text.base,
			fontWeight: '600',
			flex: 1,
			textAlign: 'right',
		},
		editable: {
			...s.input.text,
			marginBottom: 0,
			borderRadius: 0,
		},
	}));

	const ignition = device.position?.attributes?.ignition;

	const [name, setName] = useDeviceProperty(device, "name");
	const [model, setModel] = useDeviceProperty(device, "model");
	const [phone, setPhone] = useDeviceProperty(device, "phone");

	const PropertyRow = ({ label, value, isLast }) => (
		<>
			<View style={styles.row}>
				<Text style={styles.propText}>{label}</Text>
				<Text style={styles.valueText}>{value}</Text>
			</View>
			{!isLast && <View style={styles.rowSeparator} />}
		</>
	);

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Upravitelné</Text>
				<View style={styles.card}>
					<TextInput style={styles.editable} value={name} onChangeText={setName} placeholder="Název" />
					<View style={styles.rowSeparator} />
					<TextInput style={styles.editable} value={model} placeholder="SPZ" onChangeText={setModel} />
					<View style={styles.rowSeparator} />
					<TextInput style={styles.editable} value={phone} placeholder="Tel. číslo" onChangeText={setPhone} />
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Informace o zařízení</Text>
				<View style={styles.card}>
					<PropertyRow label="Stav" value={device.status} />
					<PropertyRow label="Zapalování" value={isBool(ignition) ? (ignition ? 'zapnuto' : 'vypnuto') : 'N/A'} />
					<PropertyRow label="Aktualizace" value={formatDateTime(device.lastUpdate)} />
					<PropertyRow label="Poloha" value={device.position?.address ?? 'Není známa'} />
					<PropertyRow label="Nadm. výška" value={device.position?.altitude ?? ''} />
					<PropertyRow label="Směr" value={device.position?.course ?? ''} />
					<PropertyRow label="Latitude" value={device.position?.latitude ?? ''} />
					<PropertyRow label="Longitude" value={device.position?.longitude ?? ''} />
					<PropertyRow label="Rychlost" value={formatSpeed(device.position?.speed || 0)} isLast />
				</View>
			</View>

			{Object.keys(device.position?.attributes || {}).length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionHeader}>Atributy</Text>
					<View style={styles.card}>
						{Object.keys(device.position.attributes).map((k, index, arr) => (
							<PropertyRow
								key={k}
								label={k}
								value={formatProperty(k, device.position.attributes[k])}
								isLast={index === arr.length - 1}
							/>
						))}
					</View>
				</View>
			)}
		</ScrollView>
	);
};
