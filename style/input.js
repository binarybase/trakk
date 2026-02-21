import colors from "./colors"

export default (theme) => ({
	text: {
		fontSize: 16,
		color: theme === 'dark' ? colors.base.dark : colors.base.light,
		backgroundColor: theme === 'dark' ? colors.card.dark : colors.card.light,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
	},
	large: {
		fontSize: 17,
		fontWeight: '500',
		color: theme === 'dark' ? colors.base.dark : colors.base.light,
		backgroundColor: theme === 'dark' ? colors.card.dark : colors.card.light,
		borderRadius: 14,
		padding: 16,
		marginBottom: 12,
		width: '100%',
	}
})