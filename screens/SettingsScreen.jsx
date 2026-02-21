import { ScrollView, TouchableOpacity, Text, View, Switch } from "react-native";
import { useAppContext } from "../lib/context/appContext";
import { useFocusedTabEffect } from "../lib/hooks/useFocusedTab";
import { useStyles } from '../style/useStyles';
import { useHeaderHeight } from '@react-navigation/elements';
import { useAuthContext } from "../lib/context/authContext";
import { useCallback } from "react";
import { useCache, useStorage } from "../lib/storage";
import { formatSize } from "../lib/formatter";
import { log } from "../lib/logger";

const MODULE = 'SettingsScreen';

export default SettingsScreen = () => {
	const { info, clear } = useCache();
	const [displayTestDevice, setDisplayTestDevice] = useStorage("displayTestDevice", true);
	const { userEmail, logout } = useAuthContext();
	const h = useHeaderHeight();
	const { setHeaderLeft, setHeaderTitle, setHeaderRight } = useAppContext();
	const [styles] = useStyles(s => ({
		view: {
			flex: 1,
			marginTop: h,
		},
		section: {
			marginTop: 24,
			marginHorizontal: 16,
		},
		sectionHeader: {
			...s.list.header,
			paddingHorizontal: 4,
			marginBottom: 8,
		},
		card: {
			backgroundColor: s.cardBg,
			borderRadius: 14,
			overflow: 'hidden',
			marginBottom: 16,
		},
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: 16,
			paddingVertical: 14,
		},
		rowSeparator: {
			height: 0.5,
			backgroundColor: s.separator,
			marginLeft: 16,
		},
		rowText: {
			...s.text.base,
		},
		rowValue: {
			...s.text.base,
			color: s.colors.gray[s.colors.base.dark === s.fg ? 'dark' : 'light'],
		},
		userInfo: {
			...s.text.note,
			textAlign: 'center',
			marginBottom: 8,
		},
		logoutBtn: {
			...s.btn.btn,
			...s.btn.red,
			marginHorizontal: 0,
		},
		logoutBtnText: {
			...s.btn.primaryText,
		},
		clearBtn: {
			...s.btn.btn,
			backgroundColor: 'transparent',
			marginHorizontal: 0,
			marginBottom: 0,
		},
		clearBtnText: {
			...s.text.base,
			color: s.colors.blue.primary,
			fontWeight: '500',
		},
	}));

	useFocusedTabEffect(isFocused => {
		if (!isFocused) return;
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
			<View style={styles.section}>
				<Text style={styles.userInfo}>Přihlášen jako {userEmail}</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Obecné</Text>
				<View style={styles.card}>
					<View style={styles.row}>
						<Text style={styles.rowText}>Zobrazit demo jednotku</Text>
						<Switch value={displayTestDevice} onValueChange={() => setDisplayTestDevice(!displayTestDevice)} />
					</View>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Mezipaměť</Text>
				<View style={styles.card}>
					<View style={styles.row}>
						<Text style={styles.rowText}>Stav mezipaměti</Text>
						<Text style={styles.rowValue}>
							{info ? `${info.itemsCount} položek / ${formatSize(info.size)}` : 'výpočet...'}
						</Text>
					</View>
					<View style={styles.rowSeparator} />
					<TouchableOpacity style={styles.clearBtn} onPress={clear} activeOpacity={0.6}>
						<Text style={styles.clearBtnText}>Vyčistit mezipaměť</Text>
					</TouchableOpacity>
				</View>
			</View>

			<View style={[styles.section, { marginTop: 32 }]}>
				<TouchableOpacity style={styles.logoutBtn} onPress={onLogoutPress} activeOpacity={0.7}>
					<Text style={styles.logoutBtnText}>Odhlásit se</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};
