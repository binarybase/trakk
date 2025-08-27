import CookieManager from "@react-native-cookies/cookies";
import { getCurrentAuthToken } from "./context/authContext";
import { getStorage } from "./storage";
import { isArray, isEmpty, isObject } from "./util";
import RNFetchBlob from 'rn-fetch-blob';
import Config from 'react-native-config';
import { Alert } from "react-native";
import { debug } from "./logger";

export const CACHE_METHOD = {
	// uses cache at first then fetches from network
	PREFER_CACHE: 1,
	// prefers network request if newer data are available replaces existing cache netry
	PREFER_NETWORK: 2,
	// cache disabled
	DISABLED: 3
}

export const BASE_HOST = `trakk.bbase.cz`;
export const BASE_URL = `https://${BASE_HOST}`;
export const BASE_API_URL = `${BASE_URL}/api`;
export const PDF_TYPE = 'application/pdf';
export const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

if(isEmpty(BASE_HOST) || !BASE_HOST.includes(".")){
	Alert.alert("Missing configuration", "Please define valid BASE_HOST (like `domain.com`) in your .env file");
}

// GET requests (base)
const BASE_HEADERS = {
	'Accept': 'application/json',
	//'Host': BASE_HOST,
	//'Referer': BASE_URL,
	//'Content-Type': 'application/json'
}

// POST requests (with content specified)
const POST_HEADERS = {
	'Content-Type': 'application/json'
}

/**
  * removes cached request from storage
  * @param {String} method (GET, POST)
  * @param {String} endpoint (without api for example reports/trips?query_string)
  */
export const clearCachedRequest = (method, endpoint) => {
	const cacheKey = `${method}${endpoint}`;
	const storage = getStorage();

	storage.removeItem(cacheKey);
}

/**
 * returns extension for mimeType used by backend
 * 
 * @param {String} mimeType (PDF_TYPE, EXCEL_TYPE)
 * @returns {String} valid extension (pdf, xlsx)
 */
const getExtensionForType = (type) => {
	switch(type){
		case PDF_TYPE:
			return 'pdf';
		case EXCEL_TYPE:
			return 'xlsx';
		default:
			throw new Exception('Unknown file type to download');
	}
}

/**
 * 
 * @param {String} endpoint 
 * @param {String} filename 
 * @param {String} mimeType 
 * @returns {Object} {temporary path, unlink function} or null if error
 */
export const download = async (endpoint, filename = 'download', type = EXCEL_TYPE) => {
	const token = getCurrentAuthToken();
	const fs = RNFetchBlob.fs;
	const ext = getExtensionForType(type);
	const date = new Date();

	try {
		const response = await RNFetchBlob.config({
			timeout: 5 * 60 * 1000,
			mime: EXCEL_TYPE,
			fileCache: true,
			appendExt: ext,
			path: `${fs.dirs.DocumentDir}/${filename}_${Math.floor(date.getTime() + date.getSeconds() / 2)}.${ext}`
		}).fetch("GET", `${BASE_API_URL}/${endpoint}`, {
			'Accept': type,
			'Cookie': `JSESSIONID=${token}`
		});

		if(response.info().status === 200){
			debug('API', 'downloaded file', response.info(), 'path', response.path());

			const unlink = () => fs.unlink(response.path());

			return {
				path: response.path(),
				unlink
			}
		}

		console.error('failure response', response.info());
		return null;
	} catch(ex){
		console.error('failed to download', endpoint, ex);
		return null;
	}
}

/**
 * performs GET request using caching system
 * @param {String} endpoint
 * @param {CACHE_METHOD} cachingMethod
 * @returns {Promise}
 */
export const cachedGet = (endpoint, cachingMethod = CACHE_METHOD.PREFER_CACHE) => get(endpoint, cachingMethod);

/**
 * GET, POST, PUT requests without caching
 * @param {String} endpoint 
 * @param {CACHE_METHOD} cachingMethod 
 * @returns {Promise}
 */
export const get = (endpoint, cachingMethod = CACHE_METHOD.DISABLED) => request('GET', endpoint, null, cachingMethod);
export const post = (endpoint, data) => request('POST', endpoint, data, CACHE_METHOD.DISABLED, POST_HEADERS);
export const put = (endpoint, data) => request('PUT', endpoint, data, CACHE_METHOD.DISABLED, POST_HEADERS);

/**
 * fetches resource from backend endpoint
 * 
 * @param {String} method 
 * @param {String} endpoint 
 * @param {Object} data 
 * @param {Boolean} cachingMethod 
 * @param {Object} additionalHeaders 
 * @returns {Object} {abort, error, data, status}
 */
export const request = async (method, endpoint, data = null, cachingMethod = CACHE_METHOD.DISABLED, additionalHeaders = {}) => {
	const cacheKey = `${method}${endpoint}`;
	const storage = getStorage();

	// try to store request in cache
	if(cachingMethod === CACHE_METHOD.PREFER_CACHE){
		try {
			const cachedValue = await storage.getMapAsync(cacheKey);
			debug('API', 'fetching from cache', cachedValue);
			if(cachedValue !== null && (isObject(cachedValue) || isArray(cachedValue))){
				debug('API', 'request', endpoint, 'fetched from cache');
				// return cached request value
				return {
					abort: false,
					error: null,
					data: cachedValue,
					status: 200
				}
			}
		} catch(ex){
			console.error('fetch from cache', cacheKey, ex);
			storage.removeItem(cacheKey);
		}
	}

	const token = getCurrentAuthToken();
	const headers = {
		...BASE_HEADERS,
		...additionalHeaders
		// looks like regular cookie headers are not working correctly
		//...(token !== null ? { 'Cookie': 'JSESSIONID=' + token} : {})
	}

	const options = {
		method,
		headers,
		body: ["POST", "PUT"].includes(method) ? JSON.stringify(data) : null,
		credentials: 'include',
		timeout: false
	}

	if(token){
		// setup cookie using cookiemanager
		await CookieManager.set(BASE_URL, {
			name: 'JSESSIONID',
			value: token,
			path: '/'
		})
	}

	debug('API', 'fetch from', `${BASE_API_URL}/${endpoint}`, token);
	let json = null,
		abort = false,
		error = null,
		response;

	try {
		response = await fetch(`${BASE_API_URL}/${endpoint}`, options);
		json = await response.json();
	} catch(ex){
		abort = true;
	}

	// store request in cache if status was okay
	if(cachingMethod !== CACHE_METHOD.DISABLED && !abort && response?.status === 200){
		storage.setMap(cacheKey, json);
	}

	return {
		abort,
		error,
		data: json,
		status: response?.status || 0,
		response
	}
}