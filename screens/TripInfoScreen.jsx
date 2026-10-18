import { useStyles } from '../style/useStyles';
import { ScrollView, View, Text } from 'react-native';
import { formatProperty } from '../lib/formatter';
import { durationBetweenDates } from '../lib/date';

// known trip fields in display order
const TRIP_FIELDS = [
	['startTime', 'Začátek'],
	['endTime', 'Konec'],
	['startAddress', 'Odkud'],
	['endAddress', 'Kam'],
	['distance', 'Vzdálenost'],
	['duration', 'Doba jízdy'],
	['averageSpeed', 'Průměrná rychlost'],
	['maxSpeed', 'Maximální rychlost'],
	['spentFuel', 'Spotřeba paliva'],
	['driverName', 'Řidič'],
];
const KNOWN_KEYS = new Set(TRIP_FIELDS.map(([key]) => key));

const PropertyRow = ({ label, value, isLast, styles }) => (
	<>
		<View style={styles.row}>
			<Text style={styles.propText}>{label}</Text>
			<Text style={styles.valueText}>{value}</Text>
		</View>
		{!isLast && <View style={styles.rowSeparator} />}
	</>
);

const Section = ({ title, rows, styles }) => !rows.length ? null : (
	<View style={styles.section}>
		<Text style={styles.sectionHeader}>{title}</Text>
		<View style={styles.card}>
			{rows.map(([key, label, value], index) => (
				<PropertyRow key={key} label={label} value={value} isLast={index === rows.length - 1} styles={styles} />
			))}
		</View>
	</View>
);

export default function TripInfoScreen({ route }) {
	const { trip = {} } = route.params;
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
			flex: 1.4,
			textAlign: 'right',
		},
	}));

	const values = {
		...trip,
		duration: trip.duration ?? durationBetweenDates(trip.endTime, trip.startTime),
	};
	const format = (key) => formatProperty(key, values[key]);

	const tripRows = TRIP_FIELDS
		.filter(([key]) => values[key] != null && values[key] !== '')
		.map(([key, label]) => [key, label, format(key)]);
	const otherRows = Object.keys(values)
		.filter((key) => !KNOWN_KEYS.has(key) && values[key] != null && typeof values[key] !== 'object')
		.map((key) => [key, key, format(key)]);

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<Section title="Jízda" rows={tripRows} styles={styles} />
			<Section title="Další údaje" rows={otherRows} styles={styles} />
		</ScrollView>
	);
}
