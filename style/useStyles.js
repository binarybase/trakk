import { useColorScheme, StyleSheet } from "react-native"
import generateTextStyles from './text';
import generateBtnStyles from './btn';
import generateInputStyles from './input';
import generateContentStyles from './content';
import generateListStyles from './list';
import colors from "./colors";
import { isFunction } from "../lib/util";

export const useStyles = (styles = {}) => {
	const theme = useColorScheme();
	const text = generateTextStyles(theme)
	const btn = generateBtnStyles(theme);
	const content = generateContentStyles();
	const input = generateInputStyles(theme);
	const list = generateListStyles(theme);

	const baseStyles = {
		fg: theme === "dark" ? colors.base.dark : colors.base.light,
		fgInv: theme === "dark" ? colors.base.light : colors.base.dark,
		bg: theme === "dark" ? colors.container.dark : colors.container.light,
		listBg: theme === "dark" ? colors.opacity01.dark : colors.opacity01.light,
		text,
		btn,
		content,
		input,
		list,
		colors
	};

	const sheet = StyleSheet.create({
		...(isFunction(styles) ? styles(baseStyles) : styles),
		...baseStyles
	})

	return [
		sheet,
		theme
	]
}

export { colors };