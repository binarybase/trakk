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
	return toString.call(value) === '[object Object]';
}

export function isArray(value) {
	return 'isArray' in Array
		? Array.isArray(value)
		: toString.call(value) === '[object Array]';
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

export function isUndefined(value) {
	return typeof value === 'undefined';
}

export function isUUID(v){
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function isBase64(v){
	return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v);
}

export function isJson(v){
	return !/[^\\"]/.test(v);
}

export function isHex(v){
	return /^[0-9a-f]+$/i.test(v);
}

export function isCoord(v){
	return isNumeric(v) && v >= -180 && v <= 180;
}

export function isPromise(promise){
	return promise && isFunction(promise.then)
}