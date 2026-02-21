import colors from "./colors";

export default (theme) => ({
	btn: {
		borderRadius: 14,
		height: 50,
		alignItems: "center",
		justifyContent: "center",
		color: colors.white.one,
		flexDirection: "row",
		marginBottom: 16,
		flexShrink: 0,
	},
	primary: {
		backgroundColor: colors.blue.primary,
	},
	black: {
		backgroundColor: theme === 'dark' ? colors.base.dark : colors.base.light,
	},
	red: {
		backgroundColor: colors.red,
	},
	secondary: {
		backgroundColor: colors.blue.secondary,
	},
	blackText: {
		color: theme === 'dark' ? colors.base.light : colors.white.one,
	},
	primaryText: {
		fontSize: 17,
		fontWeight: '600',
		color: colors.white.one,
	},
	secondaryText: {
		color: colors.blue.primary,
		fontWeight: '600',
	},
	disabled: {
		opacity: 0.35,
	},
	small: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 10,
	},
	smallText: {
		fontSize: 14,
	},
	noMb: {
		marginBottom: 0,
	},
})