import { isNumber, isString } from "./util";

const WEEK_IN_SECONDS = 7 * 86400 * 1000;

/**
 * returns date range of month divided to partitions
 * it splits month into four partitions
 * @param {Date} d
 * @param {Integer} part
 * @returns {Object}
 */
export const getYearMonthRange = (d, part = 0) => {
	d = d || new Date();
	part = part < 0 ? 0 : part > 3 ? 3 : part;

	const days = 8;
	const offset = d.getTimezoneOffset() / 60;
	const now = new Date();
	const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, -offset, 0, 0);
	const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, -offset, 0, 0);
	const rangeDaysStart = firstDayOfMonth.getDate() + (part * days);
	const firstDay = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), rangeDaysStart, -offset, 0, 0);
	const lastDay = new Date(firstDay);
	lastDay.setDate(lastDay.getDate() + days);
	lastDayOfMonth.setDate(lastDayOfMonth.getDate() + 1);

	return {
		firstDay: part === 0 ? firstDayOfMonth : firstDay,
		lastDay: part === 3 ? lastDayOfMonth : lastDay,
		firstDayOfMonth,
		lastDayOfMonth,
		isCurrentMonth: firstDay.getMonth() === now.getMonth() && firstDay.getYear() === now.getYear(),
		isFuture: lastDay > now
	}
}

/**
 * returns month partition of specified date
 * @param {Date} d
 * @returns {Integer} part number
 */
export const whichMonthPart = (d) => {
	const range = getYearMonthRange(d);
	return Math.min(3, Math.floor((d - range.firstDayOfMonth) / WEEK_IN_SECONDS));
}

export const toDateObject = (d) => isString(d) ? new Date(d) : (d && d.getTime) ? d : isNumber(d) ? new Date(d) : null;

export const toDST = (d) => {
	// timezone offset in hours
	const tz = (-new Date().getTimezoneOffset()) / 60;
	const dt = toDateObject(d);
	if(!dt)
		return "Invalid date";

	// convert to DST from GMT
	dt.setHours(dt.getHours() + tz);

	return dt;
}

export const formatDate = (d, options = {month: "long", day: "numeric"}) => {
	// timezone offset in hours
	//const dt = toDST(d);
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

export const formatDuration = (d) => {
	/*d /= 1000;
	const hours = Math.floor(d / 3600);
	d %= 3600;
	const minutes = Math.floor(d / 60);
	const seconds = d % 60;

	return `${('0'+hours).slice(-2)}:${('0'+minutes).slice(-2)}:${('0'+seconds).slice(-2)}`;*/
	return new Date(d).toISOString().substring(11, 19);
}

export const durationBetweenDates = (d1, d2) => +new Date(d1) - (+new Date(d2));

export const now = () => +(new Date);