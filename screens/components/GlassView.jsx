import { StyleSheet, useColorScheme, View } from 'react-native';

/**
 * Floating material surface for controls over the map.
 *
 * A translucent fill on React Native 0.71. All floating UI goes through this
 * component so it can become a native Liquid Glass view (@callstack/liquid-glass,
 * which needs the New Architecture) after the React Native upgrade.
 */
export default function GlassView({ style, children, ...props }) {
	const dark = useColorScheme() === 'dark';

	return (
		<View style={[styles.base, dark ? styles.dark : styles.light, style]} {...props}>
			{children}
		</View>
	);
}

/**
 * label color on glass surfaces
 */
export const useGlassForeground = () => (useColorScheme() === 'dark' ? '#f5f5f7' : '#1c1c1e');

const styles = StyleSheet.create({
	base: {
		borderWidth: StyleSheet.hairlineWidth,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.14,
		shadowRadius: 16,
		elevation: 6,
	},
	light: {
		backgroundColor: 'rgba(255,255,255,0.9)',
		borderColor: 'rgba(0,0,0,0.08)',
	},
	dark: {
		backgroundColor: 'rgba(38,38,40,0.9)',
		borderColor: 'rgba(255,255,255,0.14)',
	},
});
