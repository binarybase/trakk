import colors from "./colors";

export default (theme) => {
	const fg = theme === 'dark' ? colors.base.dark : colors.base.light;
	const muted = theme === 'dark' ? colors.gray.dark : colors.gray.light;

	return {
		base: {
			color: fg,
			fontSize: 15,
		},
		largeTitle: {
			fontSize: 34,
			fontWeight: '700',
			letterSpacing: 0.4,
			color: fg,
		},
		h1: {
			fontSize: 28,
			fontWeight: '700',
			letterSpacing: 0.36,
			color: fg,
		},
		h2: {
			fontSize: 22,
			fontWeight: '700',
			letterSpacing: 0.35,
			color: fg,
		},
		subtitle: {
			fontSize: 17,
			fontWeight: '600',
			color: muted,
		},
		note: {
			fontSize: 13,
			color: muted,
			marginBottom: 12,
		},
		caption: {
			fontSize: 12,
			color: muted,
			letterSpacing: -0.08,
		},
		center: {
			textAlign: 'center',
		},
	};
};