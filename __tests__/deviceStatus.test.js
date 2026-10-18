import { countByState, DEVICE_STATE, deviceMatches, deviceState, deviceStatusLabel, filterDevices, NO_SIGNAL_AFTER_MS, odometerOf, STATE_COLORS } from '../lib/deviceStatus';
import { pluralize } from '../lib/formatter';

const NOW = new Date('2026-10-07T12:00:00Z').getTime();
const device = (fixAgoMs, extra = {}) => ({
	moving: false,
	position: { fixTime: new Date(NOW - fixAgoMs).toISOString(), speed: 0, attributes: {} },
	...extra,
});

describe('deviceState', () => {
	it('is moving whenever the device moves', () => {
		expect(deviceState(device(0, { moving: true }), NOW)).toBe(DEVICE_STATE.MOVING);
	});

	it('is parked with a recent fix and without signal after a day', () => {
		expect(deviceState(device(3600e3), NOW)).toBe(DEVICE_STATE.PARKED);
		expect(deviceState(device(NO_SIGNAL_AFTER_MS + 1), NOW)).toBe(DEVICE_STATE.NO_SIGNAL);
		expect(deviceState({ moving: false, position: {} }, NOW)).toBe(DEVICE_STATE.NO_SIGNAL);
	});

	it('has a color for every state', () => {
		Object.values(DEVICE_STATE).forEach((state) => expect(STATE_COLORS[state]).toMatch(/^#/));
	});
});

describe('deviceStatusLabel', () => {
	it('includes the speed of moving devices', () => {
		const moving = device(0, { moving: true });
		moving.position.speed = 10;
		expect(deviceStatusLabel(moving, NOW)).toBe('V pohybu · 19 km/h');
		expect(deviceStatusLabel(device(60e3), NOW)).toBe('Stojí');
		expect(deviceStatusLabel(device(3 * 86400e3), NOW)).toBe('Bez signálu');
	});
});

describe('odometerOf', () => {
	it('prefers the odometer in km and falls back to total distance in m', () => {
		expect(odometerOf({ position: { attributes: { odometer: 120, totalDistance: 5 } } })).toBe(120000);
		expect(odometerOf({ position: { attributes: { totalDistance: 5000 } } })).toBe(5000);
		expect(odometerOf({})).toBeUndefined();
	});
});

describe('pluralize', () => {
	it('picks the czech plural form', () => {
		const vehicles = (n) => pluralize(n, 'vozidlo', 'vozidla', 'vozidel');
		expect([0, 1, 2, 4, 5, 12].map(vehicles)).toEqual(['vozidel', 'vozidlo', 'vozidla', 'vozidla', 'vozidel', 'vozidel']);
	});
});

describe('deviceMatches', () => {
	const octavia = { name: 'Škoda Octavia', model: '1AB 2345', uniqueId: '864123' };

	it('matches name, plate and IMEI ignoring case and diacritics', () => {
		expect(deviceMatches(octavia, 'skoda')).toBe(true);
		expect(deviceMatches(octavia, 'OCTAV')).toBe(true);
		expect(deviceMatches(octavia, '1ab')).toBe(true);
		expect(deviceMatches(octavia, '8641')).toBe(true);
		expect(deviceMatches(octavia, 'fabia')).toBe(false);
	});

	it('matches everything for an empty query and tolerates missing fields', () => {
		expect(deviceMatches(octavia, '  ')).toBe(true);
		expect(deviceMatches({ name: 'Fabia' }, 'fab')).toBe(true);
	});
});

describe('filterDevices and countByState', () => {
	const fleet = [
		{ ...device(0, { moving: true }), name: 'Octavia' },
		{ ...device(60e3), name: 'Fabia' },
		{ ...device(60e3), name: 'Superb' },
		{ ...device(3 * 86400e3), name: 'Transit' },
	];

	it('counts devices per state', () => {
		expect(countByState(fleet, NOW)).toEqual({ moving: 1, parked: 2, noSignal: 1 });
	});

	it('filters by state and query together', () => {
		const names = (filter) => filterDevices(fleet, filter, NOW).map((d) => d.name);
		expect(names({})).toEqual(['Octavia', 'Fabia', 'Superb', 'Transit']);
		expect(names({ state: DEVICE_STATE.PARKED })).toEqual(['Fabia', 'Superb']);
		expect(names({ state: DEVICE_STATE.PARKED, query: 'sup' })).toEqual(['Superb']);
		expect(names({ query: 'trans' })).toEqual(['Transit']);
	});
});
