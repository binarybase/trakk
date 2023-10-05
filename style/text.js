import colors from "./colors";

export default (theme) => ({
	base: {
		color: theme === 'dark' ? colors.base.dark : colors.base.light,
	},
	largeTitle: {
		fontSize: 34,
		fontWeight: 'bold',
		color: theme == 'dark' ? colors.base.dark : colors.base.light,
	},
	h1: {
		fontSize: 28,
		fontWeight: 'bold',
		color: theme == 'dark' ? colors.base.dark : colors.base.light,
	},
	h2: {
		fontSize: 22,
		fontWeight: '800',
		color: theme == 'dark' ? colors.base.dark : colors.base.light,
	},
	subtitle: {
		fontSize: 20,
		fontWeight: '500',
		color: theme == 'dark' ? colors.gray.dark : colors.gray.light,
	},
	note: {
		fontSize: 14,
		color: theme == 'dark' ? colors.gray.dark : colors.gray.light,
		marginBottom: 16
	},
	center: {
		textAlign: "center"
	}
})