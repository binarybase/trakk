import { ScrollView, TouchableOpacity, Text, View, Switch } from "react-native"
import { useAppContext } from "../lib/context/appContext";
import { useFocusedTabEffect } from "../lib/hooks/useFocusedTab";
import { useStyles } from '../style/useStyles';
import { useHeaderHeight } from '@react-navigation/elements';
import { useAuthContext } from "../lib/context/authContext";
import { useCallback, useEffect, useState } from "react";
import { useCache, useStorage } from "../lib/storage";
import { formatSize } from "../lib/formatter";
import { log } from "../lib/logger";

const MODULE = 'SettingsScreen';

export default SettingsScreen = () => {
	const { info, clear } = useCache();
	const [ displayTestDevice, setDisplayTestDevice ] = useStorage("displayTestDevice", true);
	const { userEmail, logout } = useAuthContext();
	const h = useHeaderHeight();
	const { setHeaderLeft, setHeaderTitle, setHeaderRight } = useAppContext();
	const [ styles ] = useStyles(s => ({
		view: {
			flex: 1,
			marginTop: h
		},
		ul: {
			...s.list.margin,
			...s.list.inset
		},
		li: {
			...s.list.list,
			marginBottom: 16
		},
		ol: {
			...s.list.list,
			marginBottom: 16,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			backgroundColor: s.listBg,
			paddingLeft: 16,
			paddingRight: 16,
			height: 46,
			borderRadius: 10
		}
	}));

	useFocusedTabEffect(isFocused => {
		if(!isFocused) return;
		setHeaderLeft(false);
		setHeaderTitle("Nastavení");
		setHeaderRight(null);

	});

	const onLogoutPress = useCallback(() => {
		log(MODULE, 'logging out user');
		logout();
	}, []);
	
	return (
		<ScrollView style={styles.view} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.ul}>
				<View style={styles.li}>
					<Text style={[styles.text.base, styles.text.center]}>Přihlášen jako {userEmail}</Text>
				</View>

				<View style={styles.ol}>
					<Text style={styles.text.base}>Zobrazit demo jednotku</Text>
					<Switch value={displayTestDevice} onValueChange={() => setDisplayTestDevice(!displayTestDevice)} />
				</View>

				<View style={styles.ol}>
					<Text style={styles.text.base}>Stav mezipaměti</Text>
					<Text style={styles.text.base}>{info ? `${info.itemsCount} položek / ${formatSize(info.size)}` : 'výpočet...'}</Text>
				</View>

				<View style={styles.li}>
					<TouchableOpacity style={[ styles.btn.btn ]} onPress={clear}>
						<Text style={styles.text.base}>Vyčistit mezipaměť</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.li}>
					<TouchableOpacity style={[ styles.btn.btn, styles.btn.red ]} onPress={onLogoutPress}>
						<Text style={styles.text.base}>Odhlásit se</Text>
					</TouchableOpacity>
				</View>
			</View>
		</ScrollView>
	)
}