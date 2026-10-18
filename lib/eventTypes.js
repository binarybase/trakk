// Traccar event types shown to the user
const EVENT_LABELS = {
	deviceOnline: 'Zařízení online',
	deviceOffline: 'Zařízení offline',
	deviceUnknown: 'Neznámý stav zařízení',
	deviceInactive: 'Zařízení neaktivní',
	deviceMoving: 'Rozjezd',
	deviceStopped: 'Zastavení',
	deviceOverspeed: 'Překročení rychlosti',
	deviceFuelDrop: 'Pokles paliva',
	deviceFuelIncrease: 'Doplnění paliva',
	commandResult: 'Odpověď na příkaz',
	geofenceEnter: 'Vjezd do geozóny',
	geofenceExit: 'Výjezd z geozóny',
	alarm: 'Alarm',
	ignitionOn: 'Zapnuté zapalování',
	ignitionOff: 'Vypnuté zapalování',
	maintenance: 'Údržba',
	textMessage: 'Textová zpráva',
	driverChanged: 'Změna řidiče',
};

export const eventLabel = (type) => EVENT_LABELS[type] || type;
