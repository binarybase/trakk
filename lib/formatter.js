//import { toDST } from "./date";

export const titleFormatter = (device) => `${device.name}${device.moving ? `(${formatSpeed(device.position.speed)})` : ""}`;

export const activityFormatter = (activityTime, short = false) => {
	const now = new Date().getTime();
	const t = new Date(activityTime).getTime();
	const diff = (now - t) / 1000;
	const biggerThanDays = diff > 86400;
	const biggerThanHours = diff > 3600;
	const biggerThanMinute = diff > 60;

	const v = biggerThanDays ? diff / 86400 : biggerThanHours ? diff / 3600 : biggerThanMinute ? diff / 60 : diff;

	return short ?
	`${Math.ceil(v)} ${biggerThanDays ? "dny" : biggerThanHours ? "h" : biggerThanMinute ? "min" : "s"}` :
	`před ${Math.ceil(v)} ${biggerThanDays ? "dny" : biggerThanHours ? "hodinami" : biggerThanMinute ? "minutami" : "sekundami"}`
}

// returns distance in km
export const formatDistance = (d) => `${parseFloat(d / 1000).toFixed(1)} km`;
export const formatDistanceKm = (d) => `${parseFloat(d).toFixed(1)} km`;
export const formatSpeed = (d) => `${(parseFloat(d) * 1.852).toFixed(0)} km/h`;
export const formatVoltage = (d) => `${parseFloat(d).toFixed(1)}V`;
export const formatSize = (d) => `${parseFloat(d / 1024 / 1024).toFixed(1)}MB`