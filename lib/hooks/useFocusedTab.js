import { useRoute } from '@react-navigation/native';
import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react';
const TabNavigatorContext = createContext();

export const createTabNavigatorContext = () => {
	const [ currentTab, setCurrentTab ] = useState();
	const onTabPress = useCallback((e) => {
		setCurrentTab(e.target);
	}, []);

	return {
		TabNavigatorContext,
		currentTab,
		onTabPress
	}
}

export const useFocusedTab = () => {
	const { currentTab } = useContext(TabNavigatorContext);
	const [ isFocused, setIsFocused ] = useState(false);
	const route = useRoute();

	useLayoutEffect(() => {
		setIsFocused(currentTab === route?.key);
	}, [ currentTab ]);

	return isFocused;
}

export const useFocusedTabEffect = (fn, deps = []) => {
	const isFocused = useFocusedTab();
	useEffect(() => fn(isFocused), [isFocused, ...deps]);
}