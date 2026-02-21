import { useHeaderHeight } from '@react-navigation/elements';
import { useStyles } from '../style/useStyles';
import { ScrollView, View, Text } from 'react-native';
import { useEffect } from 'react';
import { formatProperty } from '../lib/formatter';

export default TripInfoScreen = ({ navigation, route }) => {
	const { trip } = route.params;
	const h = useHeaderHeight();
	const [styles] = useStyles(s => ({
		view: {
			flex: 1,
			marginTop: h,
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
	}));

	useEffect(() => {
		navigation.setOptions({
			headerLargeTitle: true,
			headerTitle: "Detail trasy",
		});
	}, [navigation, route]);

	const keys = Object.keys(trip || {});

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Vlastnosti trasy</Text>
				<View style={styles.card}>
					{keys.map((k, index) => (
						<View key={k}>
							<View style={styles.row}>
								<Text style={styles.propText}>{k}</Text>
								<Text style={styles.valueText}>{formatProperty(k, trip[k])}</Text>
							</View>
							{index < keys.length - 1 && <View style={styles.rowSeparator} />}
						</View>
					))}
				</View>
			</View>
		</ScrollView>
	);
};
