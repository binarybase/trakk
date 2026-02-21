import colors from "./colors"

export default (theme) => ({
	list: {
		backgroundColor: "transparent",
	},
	inset: {
		marginHorizontal: 16,
	},
	rounded: {
		borderRadius: 14,
		overflow: "hidden",
	},
	margin: {
		marginTop: 20,
	},
	transparent: {
		backgroundColor: "transparent",
	},
	title: {
		fontSize: 22,
		color: theme === 'dark' ? colors.base.dark : colors.base.light,
		fontWeight: "700",
		marginBottom: 8,
		paddingHorizontal: 16,
	},
	header: {
		fontSize: 13,
		color: theme === 'dark' ? colors.gray.dark : colors.gray.light,
		textTransform: 'uppercase',
		letterSpacing: -0.08,
		marginBottom: 6,
		marginTop: 0,
		paddingHorizontal: 16,
	},
	footer: {
		fontSize: 13,
		color: theme === 'dark' ? colors.gray.dark : colors.gray.light,
		marginTop: 6,
		paddingHorizontal: 16,
	},
	empty: {
		justifyContent: "center",
		alignItems: "center",
		marginTop: '60%',
	},
	card: {
		backgroundColor: theme === 'dark' ? colors.card.dark : colors.card.light,
		borderRadius: 14,
		marginBottom: 12,
		overflow: 'hidden',
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	cardSeparator: {
		height: 0.5,
		backgroundColor: theme === 'dark' ? colors.separator.dark : colors.separator.light,
		marginLeft: 16,
	},
})