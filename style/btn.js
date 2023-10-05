import colors from "./colors";

export default (theme) => ({
	btn: {
		borderRadius: 12,
		height: 46,
		alignItems: "center",
		justifyContent: "center",
		color: colors.white.one,
		flexDirection: "row",
		marginBottom: 16,
		flexShrink: 0
	},
	primary: {
		backgroundColor: colors.blue.primary,
	},
	black: {
		backgroundColor: theme == 'dark' ? colors.base.dark : colors.base.light,
	},
	red: {
		backgroundColor: colors.red
	},
	secondary: {
		backgroundColor: colors.blue.secondary
	},
	blackText: {
		color: theme == 'dark' ? colors.base.light : colors.white.one,
	},
	primaryText: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.white.one
	},
	secondaryText: {
		color: colors.blue.primary
	},
	disabled: {
		opacity: 0.3
	},
	small: {
		height: 32,
		paddingRight: 8,
		paddingLeft: 8,
		borderRadius: 8
	},
	smallText: {
		fontSize: 14
	},
	noMb: {
		marginBottom: 0
	}
})