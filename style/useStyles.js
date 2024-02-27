import { useColorScheme, StyleSheet } from "react-native"
import generateTextStyles from './text';
import generateBtnStyles from './btn';
import generateInputStyles from './input';
import generateContentStyles from './content';
import generateListStyles from './list';
import colors from "./colors";
import { isFunction } from "../lib/util";
import { useMemo } from "react";

export const useStyles = (styles = {}) => {
	const theme = useColorScheme();
	const baseStyles = useMemo(() => ({
		fg: theme === "dark" ? colors.base.dark : colors.base.light,
		fgInv: theme === "dark" ? colors.base.light : colors.base.dark,
		bg: theme === "dark" ? colors.container.dark : colors.container.light,
		listBg: theme === "dark" ? colors.opacity01.dark : colors.opacity01.light,
		text: generateTextStyles(theme),
		btn: generateBtnStyles(theme),
		content: generateContentStyles(theme),
		input: generateInputStyles(theme),
		list: generateListStyles(theme),
		colors
	}), [ theme ]);

	const sheet = useMemo(() => StyleSheet.create({
		...(isFunction(styles) ? styles(baseStyles) : styles),
		...baseStyles
	}), [ theme ]);

	return [
		sheet,
		theme
	]
}

export { colors };