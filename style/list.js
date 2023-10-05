import colors from "./colors"

export default (theme) => ({
	list: {
		backgroundColor: "transparent"
	},
	inset: {
		marginLeft: 16,
		marginRight: 16
	},
	rounded: {
		borderRadius: 12,
		overflow: "hidden"
	},
	margin: {
		marginTop: 24
	},
	transparent: {
		backgroundColor: "transparent"
	},
	title: {
		fontSize: 24,
		color: theme == 'dark' ? colors.base.dark : colors.base.light,
		fontWeight: "500",
		marginBottom: 8,
		paddingLeft: 16,
		paddingRight: 16
	},
	header: {
		fontSize: 14,
		color: theme == 'dark' ? colors.gray.dark : colors.gray.light,
		marginBottom: 8,
		marginTop: 0,
		paddingLeft: 16,
		paddingRight: 16,
	},
	footer: {
		fontSize: 14,
		color: theme == 'dark' ? colors.gray.dark : colors.gray.light,
		marginTop: 8,
		paddingLeft: 16,
		paddingRight: 16,
	},
	empty: {
		justifyContent: "center",
		alignItems: "center",
		marginTop: '80%'
	}
})