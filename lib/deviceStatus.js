import { COLOR_DRIVING, COLOR_OFFLINE, COLOR_STANDING } from './constants';
import { formatSpeed } from './formatter';

export const DEVICE_STATE = {
	MOVING: 'moving',
	PARKED: 'parked',
	NO_SIGNAL: 'noSignal',
};

// a vehicle without a position fix for this long is shown as lost
export const NO_SIGNAL_AFTER_MS = 24 * 3600 * 1000;

export const STATE_COLORS = {
	[DEVICE_STATE.MOVING]: COLOR_DRIVING,
	[DEVICE_STATE.PARKED]: COLOR_STANDING,
	[DEVICE_STATE.NO_SIGNAL]: COLOR_OFFLINE,
};

/**
 * @param {Object} device - merged device with position
 * @returns {String} one of DEVICE_STATE
 */
export const deviceState = (device, now = Date.now()) => {
	if (device.moving) {
		return DEVICE_STATE.MOVING;
	}
	const fixTime = +new Date(device.position?.fixTime);
	return !fixTime || now - fixTime > NO_SIGNAL_AFTER_MS ? DEVICE_STATE.NO_SIGNAL : DEVICE_STATE.PARKED;
};

export const deviceStatusLabel = (device, now = Date.now()) => {
	switch (deviceState(device, now)) {
		case DEVICE_STATE.MOVING:
			return `V pohybu · ${formatSpeed(device.position.speed)}`;
		case DEVICE_STATE.NO_SIGNAL:
			return 'Bez signálu';
		default:
			return 'Stojí';
	}
};

/**
 * odometer in meters; teltonika reports `odometer` in km, others `totalDistance` in m
 * @returns {Number|undefined}
 */
export const odometerOf = (device) => {
	const attributes = device.position?.attributes || {};
	return attributes.odometer ? attributes.odometer * 1000 : attributes.totalDistance;
};

// lowercase without diacritics, "Škoda" matches "skoda"
const normalize = (value) => {
	const lower = String(value ?? '').toLowerCase();
	return typeof lower.normalize === 'function' ? lower.normalize('NFD').replace(/[̀-ͯ]/g, '') : lower;
};

/**
 * search by name, plate (stored as model) or IMEI
 */
export const deviceMatches = (device, query) => {
	const q = normalize(query).trim();
	return !q || [device.name, device.model, device.uniqueId].some((value) => normalize(value).includes(q));
};

/**
 * @returns {Object} number of devices per DEVICE_STATE
 */
export const countByState = (devices, now = Date.now()) => devices.reduce((counts, device) => {
	const state = deviceState(device, now);
	counts[state] = (counts[state] || 0) + 1;
	return counts;
}, {});

/**
 * @param {Object} filter - { query, state }, a null state keeps every state
 */
export const filterDevices = (devices, { query = '', state = null } = {}, now = Date.now()) =>
	devices.filter((device) => (!state || deviceState(device, now) === state) && deviceMatches(device, query));
