import { ScrollView, TouchableOpacity, Text, View, Switch } from "react-native";
import { useStyles } from '../style/useStyles';
import { useHeaderHeight } from '@react-navigation/elements';
import { useAuthContext } from "../lib/context/authContext";
import { useCallback } from "react";
import { useCache } from "../lib/storage";
import { useTestDeviceSetting } from "../lib/testDevice";
import { formatSize } from "../lib/formatter";
import { confirm } from "../lib/alert";

export default function SettingsScreen() {
	const { info, clear } = useCache();
	const [displayTestDevice, setDisplayTestDevice] = useTestDeviceSetting();
	const { userEmail, logout } = useAuthContext();
	const h = useHeaderHeight();
	const [styles] = useStyles(s => ({
		view: {
			flex: 1,
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
		sectionFooter: {
			...s.list.footer,
			paddingHorizontal: 4,
		},
		card: {
			backgroundColor: s.cardBg,
			borderRadius: 14,
			overflow: 'hidden',
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
			color: s.muted,
		},
		userInfo: {
			...s.text.note,
			textAlign: 'center',
			marginBottom: 8,
		},
		logoutSection: {
			marginTop: 32,
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

	const onLogoutPress = useCallback(() => {
		confirm({
			title: 'Odhlásit se',
			message: 'Odhlášení vymaže uložená data aplikace.',
		}).then(logout, () => {});
	}, [logout]);

	return (
		<ScrollView style={[styles.view, { marginTop: h }]} contentInsetAdjustmentBehavior="automatic">
			<View style={styles.section}>
				<Text style={styles.userInfo}>Přihlášen jako {userEmail}</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionHeader}>Obecné</Text>
				<View style={styles.card}>
					<View style={styles.row}>
						<Text style={styles.rowText}>Zobrazit demo jednotku</Text>
						<Switch value={displayTestDevice} onValueChange={setDisplayTestDevice} />
					</View>
				</View>
				<Text style={styles.sectionFooter}>Simulované vozidlo</Text>
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

			<View style={[styles.section, styles.logoutSection]}>
				<TouchableOpacity style={styles.logoutBtn} onPress={onLogoutPress} activeOpacity={0.7}>
					<Text style={styles.logoutBtnText}>Odhlásit se</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}
