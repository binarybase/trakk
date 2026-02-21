import CookieManager from '@react-native-cookies/cookies';
import { getCurrentAuthToken } from './context/authContext';
import { getStorage } from './storage';
import { isArray, isEmpty, isObject } from './util';
import RNFetchBlob from 'rn-fetch-blob';
import { Alert } from 'react-native';
import { debug, error as logError, warn } from './logger';

// ─── Cache strategy ──────────────────────────────────────────────────
export const CACHE_METHOD = {
	/** Return cache first; only fetch if cache miss */
	PREFER_CACHE: 1,
	/** Fetch from network; update cache on success */
	PREFER_NETWORK: 2,
	/** No caching */
	DISABLED: 3,
};

// ─── Base configuration ──────────────────────────────────────────────
export const BASE_HOST = 'trakk.bbase.cz';
export const BASE_URL = `https://${BASE_HOST}`;
export const BASE_API_URL = `${BASE_URL}/api`;

export const PDF_TYPE = 'application/pdf';
export const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

if (isEmpty(BASE_HOST) || !BASE_HOST.includes('.')) {
	Alert.alert(
		'Missing configuration',
		'Please define valid BASE_HOST (like `domain.com`) in your .env file'
	);
}

// ─── Headers ─────────────────────────────────────────────────────────
const BASE_HEADERS = {
	Accept: 'application/json',
};

const POST_HEADERS = {
	'Content-Type': 'application/json',
};

// ─── Cache helpers ───────────────────────────────────────────────────

/**
 * Removes a cached request entry from storage.
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} endpoint - Endpoint path
 */
export const clearCachedRequest = (method, endpoint) => {
	const cacheKey = `${method}${endpoint}`;
	getStorage().removeItem(cacheKey);
};

// ─── Download ────────────────────────────────────────────────────────

const EXTENSION_MAP = {
	[PDF_TYPE]: 'pdf',
	[EXCEL_TYPE]: 'xlsx',
};

/**
 * Downloads a file from the API endpoint.
 *
 * @param {string} endpoint - API endpoint path
 * @param {string} filename - Desired file name (without extension)
 * @param {string} type - MIME type (PDF_TYPE or EXCEL_TYPE)
 * @returns {Promise<{path: string, unlink: Function}|null>}
 */
export const download = async (endpoint, filename = 'download', type = EXCEL_TYPE) => {
	const token = getCurrentAuthToken();
	const ext = EXTENSION_MAP[type];

	if (!ext) {
		logError('API', 'Unknown file type to download:', type);
		return null;
	}

	const fs = RNFetchBlob.fs;
	const timestamp = Date.now();

	try {
		const response = await RNFetchBlob.config({
			timeout: 5 * 60 * 1000,
			mime: type,
			fileCache: true,
			appendExt: ext,
			path: `${fs.dirs.DocumentDir}/${filename}_${timestamp}.${ext}`,
		}).fetch('GET', `${BASE_API_URL}/${endpoint}`, {
			Accept: type,
			Cookie: `JSESSIONID=${token}`,
		});

		if (response.info().status === 200) {
			debug('API', 'downloaded file', response.info(), 'path', response.path());
			return {
				path: response.path(),
				unlink: () => fs.unlink(response.path()),
			};
		}

		logError('API', 'download failure response', response.info());
		return null;
	} catch (ex) {
		logError('API', 'failed to download', endpoint, ex);
		return null;
	}
};

// ─── HTTP methods ────────────────────────────────────────────────────

/** GET with caching enabled (prefer cache) */
export const cachedGet = (endpoint, cachingMethod = CACHE_METHOD.PREFER_CACHE) =>
	get(endpoint, cachingMethod);

/** GET request */
export const get = (endpoint, cachingMethod = CACHE_METHOD.DISABLED) =>
	request('GET', endpoint, null, cachingMethod);

/** POST request */
export const post = (endpoint, data) =>
	request('POST', endpoint, data, CACHE_METHOD.DISABLED, POST_HEADERS);

/** PUT request */
export const put = (endpoint, data) =>
	request('PUT', endpoint, data, CACHE_METHOD.DISABLED, POST_HEADERS);

// ─── Core request function ───────────────────────────────────────────

/**
 * Makes an authenticated API request to the Traccar backend.
 *
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (appended to BASE_API_URL)
 * @param {Object|null} data - Request body for POST/PUT
 * @param {number} cachingMethod - Cache strategy from CACHE_METHOD
 * @param {Object} additionalHeaders - Extra headers to merge
 * @returns {Promise<{abort: boolean, error: any, data: any, status: number, response?: Response}>}
 */
export const request = async (
	method,
	endpoint,
	data = null,
	cachingMethod = CACHE_METHOD.DISABLED,
	additionalHeaders = {}
) => {
	const cacheKey = `${method}${endpoint}`;
	const storage = getStorage();

	// ── Try cache first ──
	if (cachingMethod === CACHE_METHOD.PREFER_CACHE) {
		try {
			const cachedValue = await storage.getMapAsync(cacheKey);
			if (cachedValue !== null && (isObject(cachedValue) || isArray(cachedValue))) {
				debug('API', 'cache hit for', endpoint);
				return { abort: false, error: null, data: cachedValue, status: 200 };
			}
		} catch (ex) {
			warn('API', 'cache read failed for', cacheKey, ex);
			storage.removeItem(cacheKey);
		}
	}

	// ── Set up session cookie ──
	const token = getCurrentAuthToken();
	if (token) {
		await CookieManager.set(BASE_URL, {
			name: 'JSESSIONID',
			value: token,
			path: '/',
		});
	}

	const headers = { ...BASE_HEADERS, ...additionalHeaders };
	const options = {
		method,
		headers,
		body: ['POST', 'PUT'].includes(method) ? JSON.stringify(data) : null,
		credentials: 'include',
	};

	debug('API', method, `${BASE_API_URL}/${endpoint}`);

	let json = null;
	let abort = false;
	let error = null;
	let response;

	try {
		response = await fetch(`${BASE_API_URL}/${endpoint}`, options);
		json = await response.json();
	} catch (ex) {
		abort = true;
		error = ex;
		warn('API', 'request failed', endpoint, ex?.message);
	}

	// ── Update cache on success ──
	if (cachingMethod !== CACHE_METHOD.DISABLED && !abort && response?.status === 200) {
		storage.setMap(cacheKey, json);
	}

	return {
		abort,
		error,
		data: json,
		status: response?.status || 0,
		response,
	};
};