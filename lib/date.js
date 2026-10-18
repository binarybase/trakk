import { isNumber, isString } from "./util";

export const MONTH_PARTS = 4;
const PART_DAYS = 8;

/**
 * returns date range of month divided to partitions
 * it splits month into four partitions of 8 days, the last one ends with the month
 * boundaries are aligned to UTC midnight
 * @param {Date} d
 * @param {Integer} part
 * @returns {Object}
 */
export const getYearMonthRange = (d, part = 0) => {
	d = d || new Date();
	part = Math.min(MONTH_PARTS - 1, Math.max(0, part));

	const offset = d.getTimezoneOffset() / 60;
	const day = (n) => new Date(d.getFullYear(), d.getMonth(), n, -offset, 0, 0);

	// lastDayOfMonth is exclusive: first day of the next month
	const firstDayOfMonth = day(1);
	const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1, -offset, 0, 0);
	const firstDay = day(1 + part * PART_DAYS);
	const lastDay = part === MONTH_PARTS - 1 ? lastDayOfMonth : day(1 + (part + 1) * PART_DAYS);

	return {
		firstDay,
		lastDay,
		firstDayOfMonth,
		lastDayOfMonth,
		// range is still open, data may change
		isFuture: lastDay > new Date(),
	};
}

/**
 * returns month partition of specified date
 * @param {Date} d
 * @returns {Integer} part number
 */
export const whichMonthPart = (d) => {
	for (let part = MONTH_PARTS - 1; part > 0; part--) {
		if (d >= getYearMonthRange(d, part).firstDay) {
			return part;
		}
	}
	return 0;
}

export const isCurrentMonth = (d, now = new Date()) =>
	d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

export const toDateObject = (d) => isString(d) ? new Date(d) : (d && d.getTime) ? d : isNumber(d) ? new Date(d) : null;

export const formatDate = (d, options = {month: "long", day: "numeric"}) => {
	const dt = toDateObject(d);

	try {
		return new Intl.DateTimeFormat("cs-CZ", options).format(dt);
	} catch(ex){}

	return "Invalid date";
}

export const formatDateTime = (d) => formatDate(d, {
	day: "numeric",
	month: "numeric",
	hour: "numeric",
	minute: "numeric"
})

export const formatTime = (d) => formatDate(d, {
	hour: "numeric",
	minute: "numeric",
	second: "numeric"
})

export const formatShortDate = (d) => formatDate(d, { day: "numeric", month: "numeric" });

export const formatShortTime = (d) => formatDate(d, { hour: "numeric", minute: "2-digit" });

export const formatMonth = (d) => {
	const month = formatDate(d, { month: "long", year: "numeric" });
	return month.charAt(0).toUpperCase() + month.slice(1);
}

/**
 * formats milliseconds as HH:MM:SS, hours are not capped at 24
 * @param {Number} ms
 * @returns {String}
 */
export const formatDuration = (ms) => {
	const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
	const pad = (n) => String(n).padStart(2, '0');
	return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total % 3600 / 60))}:${pad(total % 60)}`;
}

export const durationBetweenDates = (d1, d2) => +new Date(d1) - (+new Date(d2));

export const now = () => +(new Date);
