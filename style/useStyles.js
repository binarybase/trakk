import { useColorScheme, StyleSheet } from "react-native"
import generateTextStyles from './text';
import generateBtnStyles from './btn';
import generateInputStyles from './input';
import generateContentStyles from './content';
import generateListStyles from './list';
import colors from "./colors";
import { isFunction } from "../lib/util";
import { useMemo } from "react";

const themed = (pair, theme) => theme === "dark" ? pair.dark : pair.light;

export const useStyles = (styles = {}) => {
	const theme = useColorScheme();
	const baseStyles = useMemo(() => ({
		isDark: theme === "dark",
		fg: theme === "dark" ? colors.base.dark : colors.base.light,
		fgInv: theme === "dark" ? colors.base.light : colors.base.dark,
		bg: themed(colors.container, theme),
		cardBg: themed(colors.card, theme),
		listBg: themed(colors.opacity01, theme),
		separator: themed(colors.separator, theme),
		muted: themed(colors.gray, theme),
		text: generateTextStyles(theme),
		btn: generateBtnStyles(theme),
		content: generateContentStyles(theme),
		input: generateInputStyles(theme),
		list: generateListStyles(theme),
		colors
	}), [ theme ]);

	const sheet = useMemo(
		() => StyleSheet.create({
			...(isFunction(styles) ? styles(baseStyles) : styles),
			...baseStyles
		}),
		// callers pass inline style factories; the sheet only depends on the theme
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ baseStyles ]
	);

	return [
		sheet,
		theme
	]
}

export { colors };
