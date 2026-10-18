import { useStyles } from '../style/useStyles';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { formatDateTime } from '../lib/date';
import { isBool, isNumeric } from '../lib/util';
import { useDeviceProperty } from '../lib/hooks/useDeviceProperty';
import { useDeviceInfo } from '../lib/context/deviceInfoContext';
import { formatProperty, formatSpeed } from '../lib/formatter';

const STATUS_LABELS = {
	online: 'online',
	offline: 'offline',
	unknown: 'neznámý',
};

const withUnit = (value, unit, digits = 0) => isNumeric(value) ? `${Number(value).toFixed(digits)}${unit}` : '–';

const PropertyRow = ({ label, value, isLast, styles }) => (
	<>
		<View style={styles.row}>
			<Text style={styles.propText}>{label}</Text>
			<Text style={styles.valueText}>{value}</Text>
		</View>
		{!isLast && <View style={styles.rowSeparator} />}
	</>
);

const EditableRow = ({ label, isLast, styles, ...inputProps }) => (
	<>
		<View style={styles.row}>
			<Text style={styles.propText}>{label}</Text>
			<TextInput
				style={styles.editable}
				placeholderTextColor={styles.muted}
				clearButtonMode="while-editing"
				{...inputProps}
			/>
		</View>
		{!isLast && <View style={styles.rowSeparator} />}
	</>
);

export default function DevicePropertiesScreen() {
	const device = useDeviceInfo();
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
		sectionFooter: {
			...s.list.footer,
			paddingHorizontal: 4,
			marginTop: -8,
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
			flex: 1.4,
			textAlign: 'right',
		},
		editable: {
			...s.text.base,
			fontWeight: '600',
			flex: 1.4,
			textAlign: 'right',
			padding: 0,
		},
	}));

	const position = device.position;
	const ignition = position?.attributes?.ignition;
	const attributeKeys = Object.keys(position?.attributes || {});

	const [name, setName] = useDeviceProperty(device, "name");
	const [model, setModel] = useDeviceProperty(device, "model");
	const [phone, setPhone] = useDeviceProperty(device, "phone");

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag">
			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Upravitelné</Text>
				<View style={styles.card}>
					<EditableRow label="Název" value={name} onChangeText={setName} placeholder="Název vozidla" styles={styles} />
					<EditableRow label="SPZ" value={model} onChangeText={setModel} placeholder="1AB 2345" autoCapitalize="characters" styles={styles} />
					<EditableRow label="Telefon" value={phone} onChangeText={setPhone} placeholder="+420" keyboardType="phone-pad" isLast styles={styles} />
				</View>
				<Text style={styles.sectionFooter}>Změny se ukládají automaticky.</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Informace o zařízení</Text>
				<View style={styles.card}>
					<PropertyRow styles={styles} label="Stav" value={STATUS_LABELS[device.status] ?? device.status ?? '–'} />
					<PropertyRow styles={styles} label="Zapalování" value={isBool(ignition) ? (ignition ? 'zapnuto' : 'vypnuto') : '–'} />
					<PropertyRow styles={styles} label="Aktualizace" value={formatDateTime(device.lastUpdate)} />
					<PropertyRow styles={styles} label="Poloha" value={position?.address ?? 'Není známa'} />
					<PropertyRow styles={styles} label="Nadm. výška" value={withUnit(position?.altitude, ' m')} />
					<PropertyRow styles={styles} label="Směr" value={withUnit(position?.course, '°')} />
					<PropertyRow styles={styles} label="Zeměpisná šířka" value={withUnit(position?.latitude, '', 6)} />
					<PropertyRow styles={styles} label="Zeměpisná délka" value={withUnit(position?.longitude, '', 6)} />
					<PropertyRow styles={styles} label="Rychlost" value={formatSpeed(position?.speed || 0)} isLast />
				</View>
			</View>

			{attributeKeys.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionHeader}>Atributy</Text>
					<View style={styles.card}>
						{attributeKeys.map((k, index) => (
							<PropertyRow
								key={k}
								styles={styles}
								label={k}
								value={String(formatProperty(k, position.attributes[k]))}
								isLast={index === attributeKeys.length - 1}
							/>
						))}
					</View>
				</View>
			)}
		</ScrollView>
	);
}
