import { activityFormatter, titleFormatter } from '../lib/formatter';

const NOW = new Date('2026-10-07T12:00:00Z').getTime();
const ago = (seconds) => new Date(NOW - seconds * 1000).toISOString();

describe('activityFormatter', () => {
	beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
	afterEach(() => jest.restoreAllMocks());

	it('uses the largest whole unit, rounded down', () => {
		expect(activityFormatter(ago(30), true)).toBe('30 s');
		expect(activityFormatter(ago(60), true)).toBe('1 min');
		expect(activityFormatter(ago(119), true)).toBe('1 min');
		expect(activityFormatter(ago(3 * 3600 + 59), true)).toBe('3 h');
		expect(activityFormatter(ago(3 * 86400), true)).toBe('3 d');
	});

	it('uses the singular form for one unit', () => {
		expect(activityFormatter(ago(1))).toBe('před 1 sekundou');
		expect(activityFormatter(ago(60))).toBe('před 1 minutou');
		expect(activityFormatter(ago(3600))).toBe('před 1 hodinou');
		expect(activityFormatter(ago(86400))).toBe('před 1 dnem');
	});

	it('uses the plural form otherwise', () => {
		expect(activityFormatter(ago(5 * 60))).toBe('před 5 minutami');
		expect(activityFormatter(ago(2 * 86400))).toBe('před 2 dny');
	});

	it('does not go negative for clock skew', () => {
		expect(activityFormatter(ago(-10), true)).toBe('0 s');
	});
});

describe('titleFormatter', () => {
	it('adds the speed of moving devices', () => {
		expect(titleFormatter({ name: 'Octavia', moving: true, position: { speed: 10 } })).toBe('Octavia (19 km/h)');
		expect(titleFormatter({ name: 'Octavia', moving: false, position: { speed: 0 } })).toBe('Octavia');
	});
});
