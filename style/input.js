import colors from "./colors"

export default (theme) => ({
	text: {
		fontSize: 16,
		color: theme == 'dark' ? colors.base.dark : colors.base.light,
		borderColor: theme == 'dark' ? colors.gray.dark : colors.gray.light,
		borderBottomWidth: 1,
		padding: 16,
		paddingLeft: 0,
		marginBottom: 16
	},
	large: {
		fontSize: 28,
		fontWeight: '600',
		color: theme == 'dark' ? colors.base.dark : colors.base.light,
		paddingBottom: 20
	}
})