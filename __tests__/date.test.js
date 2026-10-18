import { formatDuration, getYearMonthRange, MONTH_PARTS, whichMonthPart } from '../lib/date';

// the app's users are in Central Europe; covers both DST switches
process.env.TZ = 'Europe/Prague';

const MONTHS = [
	new Date(2026, 0, 15), // 31 days
	new Date(2024, 1, 10), // leap February
	new Date(2026, 1, 10), // 28 days
	new Date(2026, 2, 20), // DST starts
	new Date(2026, 9, 7), // DST ends
	new Date(2026, 3, 1), // 30 days
];

describe('getYearMonthRange', () => {
	it.each(MONTHS)('splits %s into contiguous partitions covering the month', (month) => {
		const ranges = [...Array(MONTH_PARTS).keys()].map((part) => getYearMonthRange(month, part));

		expect(ranges[0].firstDay).toEqual(ranges[0].firstDayOfMonth);
		expect(ranges[MONTH_PARTS - 1].lastDay).toEqual(ranges[0].lastDayOfMonth);
		for (let part = 1; part < MONTH_PARTS; part++) {
			expect(ranges[part].firstDay).toEqual(ranges[part - 1].lastDay);
		}
	});

	it('keeps month boundaries aligned to UTC midnight', () => {
		const range = getYearMonthRange(new Date(2026, 0, 15));
		expect(range.firstDayOfMonth.toISOString()).toBe('2026-01-01T00:00:00.000Z');
		expect(range.lastDayOfMonth.toISOString()).toBe('2026-02-01T00:00:00.000Z');
	});

	it('clamps the partition number', () => {
		const month = new Date(2026, 0, 15);
		expect(getYearMonthRange(month, -1)).toEqual(getYearMonthRange(month, 0));
		expect(getYearMonthRange(month, 9)).toEqual(getYearMonthRange(month, MONTH_PARTS - 1));
	});

	it('marks ranges that are not over yet', () => {
		expect(getYearMonthRange(new Date(2020, 0, 1)).isFuture).toBe(false);
		expect(getYearMonthRange(new Date(2100, 0, 1)).isFuture).toBe(true);
	});
});

describe('whichMonthPart', () => {
	it.each(MONTHS)('returns the partition whose range contains each hour of %s', (month) => {
		const { firstDayOfMonth, lastDayOfMonth } = getYearMonthRange(month);

		for (let t = +firstDayOfMonth; t < +lastDayOfMonth; t += 3600 * 1000) {
			const d = new Date(t);
			// ranges are UTC aligned while the month of a date is local, so the
			// first hours of the next local month still fall into this month's range
			if (d.getMonth() !== month.getMonth()) continue;

			const range = getYearMonthRange(d, whichMonthPart(d));
			expect(d >= range.firstDay && d < range.lastDay).toBe(true);
		}
	});

	it('does not skip the third partition on days 22-24 (7 vs 8 day mismatch)', () => {
		expect(whichMonthPart(new Date(2026, 0, 22, 12))).toBe(2);
		expect(whichMonthPart(new Date(2026, 0, 24, 12))).toBe(2);
		expect(whichMonthPart(new Date(2026, 0, 25, 12))).toBe(3);
	});
});

describe('formatDuration', () => {
	it('formats hours, minutes and seconds', () => {
		expect(formatDuration(0)).toBe('00:00:00');
		expect(formatDuration(3661 * 1000)).toBe('01:01:01');
	});

	it('does not wrap durations over a day', () => {
		expect(formatDuration(50 * 3600 * 1000)).toBe('50:00:00');
	});

	it('handles invalid input', () => {
		expect(formatDuration(undefined)).toBe('00:00:00');
		expect(formatDuration(-5000)).toBe('00:00:00');
	});
});
