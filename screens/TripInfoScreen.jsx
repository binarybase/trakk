import { useHeaderHeight } from '@react-navigation/elements';
import { useStyles } from '../style/useStyles';
import { ScrollView, View, Text } from 'react-native';
import { useEffect } from 'react';
import { formatDateTime } from '../lib/date';

export default TripInfoScreen = ({ navigation, route }) => {
	const { trip } = route.params;
	const h = useHeaderHeight();
	const [ styles ]= useStyles(s => ({
		view: {
			flex: 1,
			marginTop: h
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
			fontWeight: 'bold'
		}
	}));

	useEffect(() => {
		navigation.setOptions({
			headerLargeTitle: true,
			headerTitle: "Detail trasy"
		})
	}, [ navigation, route ]);

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.ul}>
				{Object.keys(trip || {}).map((k, index) => {
					return (
						<View style={styles.li} key={index}>
							<Text style={styles.propText}>{k}</Text>
							<Text style={styles.valueText}>{trip[k]}</Text>
						</View>
					)
				})}
			</View>
		</ScrollView>
	)
}