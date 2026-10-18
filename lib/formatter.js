import { formatDateTime, formatDuration } from "./date";
import { isBool, isNumeric } from "./util";

export const titleFormatter = (device) => `${device.name}${device.moving ? ` (${formatSpeed(device.position.speed)})` : ""}`;

// [unit in seconds, short label, "před 1 …", "před N …"]
const ACTIVITY_UNITS = [
	[86400, 'd', 'dnem', 'dny'],
	[3600, 'h', 'hodinou', 'hodinami'],
	[60, 'min', 'minutou', 'minutami'],
	[1, 's', 'sekundou', 'sekundami'],
];

export const activityFormatter = (activityTime, short = false) => {
	const diff = Math.max(0, (Date.now() - new Date(activityTime).getTime()) / 1000);
	const [size, shortLabel, one, many] =
		ACTIVITY_UNITS.find(([s]) => diff >= s) || ACTIVITY_UNITS[ACTIVITY_UNITS.length - 1];
	const v = Math.floor(diff / size);

	return short ? `${v} ${shortLabel}` : `před ${v} ${v === 1 ? one : many}`;
}

/**
 * czech plural form: 1 vozidlo, 2–4 vozidla, 5 vozidel
 */
export const pluralize = (n, one, few, many) => n === 1 ? one : n >= 2 && n <= 4 ? few : many;

// returns distance in km
export const formatDistance = (d) => `${parseFloat(d / 1000).toFixed(1)} km`;
export const formatSpeed = (d) => `${(parseFloat(d) * 1.852).toFixed(0)} km/h`;
export const formatVoltage = (d) => `${parseFloat(d).toFixed(1)}V`;
export const formatSize = (d) => `${parseFloat(d / 1024 / 1024).toFixed(1)}MB`

export const formatProperty = (k, v) => {
	// known keys
	if(['startTime', 'endTime'].includes(k)){
		return formatDateTime(v);
	}

	if(['averageSpeed', 'maxSpeed', 'speed'].includes(k)){
		return formatSpeed(v);
	}

	if(k === 'distance' || k === 'totalDistance'){
		return formatDistance(v);
	}

	if(k === 'duration' || k === 'hours'){
		return formatDuration(v);
	}

	if(['startLat', 'endLat', 'startLon', 'endLon'].includes(k)){
		return parseFloat(v).toFixed(6);
	}

	// generic float
	if(isNumeric(v) && String(v).includes('.')){
		return parseFloat(v).toFixed(1);
	}

	// generic int
	if(isNumeric(v)){
		return parseInt(v, 10);
	}

	// bool
	if(isBool(v)){
		return v ? 'Ano' : 'Ne';
	}

	//  string
	return v;
}
