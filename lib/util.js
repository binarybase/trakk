export function isEmpty(value, allowEmptyString) {
	return (
		value == null ||
		(!allowEmptyString ? value === '' : false) ||
		(isArray(value) && value.length === 0)
	);
}

export function isBool(value) {
	return typeof value === 'boolean';
}

export function isObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

export function isArray(value) {
	return Array.isArray(value);
}

export function isNumber(value) {
	return typeof value === 'number' && isFinite(value);
}

export function isNumeric(value) {
	return !isNaN(parseFloat(value)) && isFinite(value);
}

export function isString(value) {
	return typeof value === 'string';
}

export function isFunction(value) {
	return typeof value === 'function';
}
