module.exports = {
	root: true,
	extends: '@react-native-community',
	overrides: [
		{
			// the community config only wires the babel parser for *.js
			files: ['*.jsx'],
			parser: '@babel/eslint-parser',
		},
	],
	rules: {
		// formatting is not enforced through lint; it buried the real problems
		'prettier/prettier': 'off',
		quotes: 'off',
		semi: 'off',
		curly: 'off',
		'comma-dangle': 'off',
		'eol-last': 'off',
		'keyword-spacing': 'off',
		'no-trailing-spaces': 'off',
		'no-mixed-spaces-and-tabs': 'off',
		'space-infix-ops': 'off',
		'new-parens': 'off',
		// metro uses the automatic JSX runtime
		'react/react-in-jsx-scope': 'off',
		// react-navigation takes render functions such as headerRight as options
		'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
	},
};
