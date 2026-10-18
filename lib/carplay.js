import { CarPlay, PointOfInterestTemplate, ListTemplate, TabBarTemplate } from 'react-native-carplay';
import deviceStore from './deviceStore';
import { activityFormatter, formatSpeed, formatDistance, formatVoltage } from './formatter';
import { log, debug } from './logger';
import { odometerOf } from './deviceStatus';

const MODULE = 'CarPlay';
const MAX_POI = 12; // Apple's hard limit for CPPointOfInterestTemplate

let _tabBar = null;
let _poiTemplate = null;
let _listTemplate = null;
let _unsubscribe = null;
let _updateTimer = null;
let _pendingDevices = null;
let _focusedDeviceId = null;
let _allDevicesWithPosition = [];

const UPDATE_INTERVAL_MS = 15000;

// ─── Helpers ─────────────────────────────────────────────────────────

const buildDetailSummary = (device) => {
	const pos = device.position;
	const attrs = pos?.attributes || {};
	const parts = [];

	if (pos.address) parts.push(pos.address);
	if (device.moving && pos.speed) parts.push(`Rychlost: ${formatSpeed(pos.speed)}`);
	if (typeof attrs.ignition === 'boolean') parts.push(`Zapalování: ${attrs.ignition ? 'Zapnuto' : 'Vypnuto'}`);
	if (typeof attrs.batteryLevel === 'number') parts.push(`Baterie: ${attrs.batteryLevel}%`);
	if (attrs.power) parts.push(`Napájení: ${formatVoltage(attrs.power)}`);
	const odometer = odometerOf(device);
	if (odometer) parts.push(`Najeto: ${formatDistance(odometer)}`);
	if (pos.fixTime) parts.push(`Signál: ${activityFormatter(pos.fixTime, true)}`);

	return parts.join(' | ') || '';
};

const deviceStatus = (device) => {
	const moving = device.moving;
	const speed = device.position?.speed
		? `${(device.position.speed * 1.852).toFixed(0)} km/h`
		: '';
	const activity = device.position?.fixTime
		? activityFormatter(device.position.fixTime, true)
		: '';

	return moving
		? `V pohybu ${speed}`
		: activity ? `Stojí — ${activity}` : 'Stojí';
};

const deviceToPOI = (device, label) => {
	const summary = buildDetailSummary(device);
	const title = label ? `${label}. ${device.name}` : (device.name || '');
	const subtitle = deviceStatus(device);

	return {
		id: String(device.id),
		location: {
			latitude: device.position.latitude,
			longitude: device.position.longitude,
		},
		pinLabel: label || '',
		title,
		subtitle: subtitle || '',
		summary: summary || '',
		detailTitle: title,
		detailSubtitle: subtitle || '',
		detailSummary: summary || '',
	};
};

// ─── Templates ───────────────────────────────────────────────────────

const createPOITemplate = () => {
	let devices;
	let title;

	if (_focusedDeviceId) {
		// Focused — show only this device so the map zooms to it
		const device = _allDevicesWithPosition.find(
			(d) => String(d.id) === String(_focusedDeviceId),
		);
		devices = device ? [device] : _allDevicesWithPosition.slice(0, MAX_POI);
		title = device ? device.name : 'Mapa';
	} else {
		// All devices overview
		devices = _allDevicesWithPosition.slice(0, MAX_POI);
		title = 'Mapa';
	}

	const items = devices.map((device, i) => deviceToPOI(device, String(i + 1)));

	return new PointOfInterestTemplate({
		title,
		items,
		onPointOfInterestSelect: (poi) => {
			debug(MODULE, 'poi selected', poi.title, poi.id);
			if (_focusedDeviceId) {
				// Already focused — tap again to return to all devices
				debug(MODULE, 'unfocus from map');
				_focusedDeviceId = null;
				rebuildTabBar(false);
			} else if (poi.id) {
				// From all-devices view — zoom to this device
				_focusedDeviceId = poi.id;
				rebuildTabBar(false);
			}
		},
	});
};

const createListTemplate = () => {
	const devices = _allDevicesWithPosition;
	const items = [];
	let indexOffset = 0;

	if (_focusedDeviceId) {
		items.push({ text: '← Všechna vozidla', detailText: 'Zobrazit mapu se všemi vozidly' });
		indexOffset = 1;
	}

	devices.forEach((device, i) => {
		items.push({
			text: `${i + 1}. ${device.name || ''}`,
			detailText: deviceStatus(device),
		});
	});

	const sections = [{
		header: _focusedDeviceId ? 'Sledování' : `Vozidla (${devices.length})`,
		items,
	}];

	return new ListTemplate({
		title: 'Vozidla',
		sections,
		onItemSelect: async ({ index }) => {
			if (_focusedDeviceId && index === 0) {
				// Back to all devices
				debug(MODULE, 'list: show all');
				_focusedDeviceId = null;
				rebuildTabBar(false);
				return;
			}
			const device = devices[index - indexOffset];
			if (device) {
				debug(MODULE, 'list selected', device.name);
				_focusedDeviceId = String(device.id);
				rebuildTabBar(false);
			}
		},
	});
};

// ─── Refresh ─────────────────────────────────────────────────────────

const rebuildTabBar = (animated) => {
	_poiTemplate = createPOITemplate();
	_listTemplate = createListTemplate();

	_tabBar = new TabBarTemplate({
		title: 'Trakk',
		templates: [_poiTemplate, _listTemplate],
		onTemplateSelect: () => {},
	});

	CarPlay.setRootTemplate(_tabBar, animated);
};

// ─── Init ────────────────────────────────────────────────────────────

const handleCarPlayConnect = () => {
	log(MODULE, 'connected');

	const devices = deviceStore.getDevices();
	_allDevicesWithPosition = devices.filter((d) => d.position);
	_focusedDeviceId = null;

	rebuildTabBar(true);

	// If no devices yet (cold start), do an immediate rebuild once data arrives
	let didInitialRebuild = _allDevicesWithPosition.length > 0;

	if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

	_unsubscribe = deviceStore.subscribe((updatedDevices) => {
		// First update after cold start: apply immediately (no throttle)
		if (!didInitialRebuild) {
			didInitialRebuild = true;
			_allDevicesWithPosition = updatedDevices.filter((d) => d.position);
			rebuildTabBar(false);
			_pendingDevices = null;
			if (_updateTimer) { clearTimeout(_updateTimer); _updateTimer = null; }
			return;
		}

		_pendingDevices = updatedDevices;
		if (!_updateTimer) {
			_updateTimer = setTimeout(() => {
				_updateTimer = null;
				if (_pendingDevices) {
					_allDevicesWithPosition = _pendingDevices.filter((d) => d.position);
					rebuildTabBar(false);
					_pendingDevices = null;
				}
			}, UPDATE_INTERVAL_MS);
		}
	});
};

const handleCarPlayDisconnect = () => {
	log(MODULE, 'disconnected');
	if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
	if (_updateTimer) { clearTimeout(_updateTimer); _updateTimer = null; }
	_pendingDevices = null;
	_poiTemplate = null;
	_listTemplate = null;
	_tabBar = null;
	_focusedDeviceId = null;
};

export const initCarPlay = () => {
	CarPlay.registerOnConnect(handleCarPlayConnect);
	CarPlay.registerOnDisconnect(handleCarPlayDisconnect);

	// If CarPlay was already connected before JS registered the listener
	// (cold start triggered by CarPlay scene), run the handler now.
	if (CarPlay.connected) {
		debug(MODULE, 'already connected — initializing immediately');
		handleCarPlayConnect();
	}

	debug(MODULE, 'listeners registered');
};
