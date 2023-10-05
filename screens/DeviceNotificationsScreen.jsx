export default DeviceNotificationsScreen = () => {
	const [ styles ] = useStyles(s => ({
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
			marginBottom: 16
		},
		ol: {
			...s.list.list,
			marginBottom: 16,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			backgroundColor: s.listBg,
			paddingLeft: 16,
			paddingRight: 16,
			height: 46,
			borderRadius: 10
		}
	}));

	

	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.ul}>
				<View style={styles.li}>
					<Text style={[styles.text.base, styles.text.center]}>Varovat při</Text>
				</View>

				<View style={styles.ol}>
					<Text style={styles.text.base}>Zapnuté zapalování</Text>
					<Switch value={displayTestDevice} onValueChange={() => setDisplayTestDevice(!displayTestDevice)} />
				</View>
			</View>
		</ScrollView>
	)
}