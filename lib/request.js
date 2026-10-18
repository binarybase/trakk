import CookieManager from '@react-native-cookies/cookies';
import { getCurrentAuthToken } from './context/authContext';
import { getStorage } from './storage';
import { isArray, isObject } from './util';
import RNFetchBlob from 'rn-fetch-blob';
import { debug, error as logError, warn } from './logger';

// ─── Cache strategy ──────────────────────────────────────────────────
export const CACHE_METHOD = {
	/** Return cache first; only fetch if cache miss */
	PREFER_CACHE: 1,
	/** Fetch from network and update cache; fall back to cache when offline */
	PREFER_NETWORK: 2,
	/** No caching */
	DISABLED: 3,
};

// ─── Base configuration ──────────────────────────────────────────────
// hardcoded since react-native-config broke the native build (fb86f81)
export const BASE_HOST = 'trakk.bbase.cz';
export const BASE_URL = `https://${BASE_HOST}`;
export const BASE_API_URL = `${BASE_URL}/api`;

export const PDF_TYPE = 'application/pdf';
export const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const REQUEST_TIMEOUT_MS = 30 * 1000;

// ─── Headers ─────────────────────────────────────────────────────────
const BASE_HEADERS = {
	Accept: 'application/json',
};

const POST_HEADERS = {
	'Content-Type': 'application/json',
};

// ─── Cache helpers ───────────────────────────────────────────────────

const readCache = async (cacheKey) => {
	try {
		const cachedValue = await getStorage().getMapAsync(cacheKey);
		if (isObject(cachedValue) || isArray(cachedValue)) {
			return cachedValue;
		}
	} catch (ex) {
		warn('API', 'cache read failed for', cacheKey, ex);
		getStorage().removeItem(cacheKey);
	}
	return null;
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
export const cachedGet = (endpoint, cachingMethod = CACHE_METHOD.PREFER_CACHE, cacheKey) =>
	get(endpoint, cachingMethod, cacheKey);

/** GET request */
export const get = (endpoint, cachingMethod = CACHE_METHOD.DISABLED, cacheKey) =>
	request('GET', endpoint, null, cachingMethod, {}, cacheKey);

/** POST request */
export const post = (endpoint, data) =>
	request('POST', endpoint, data, CACHE_METHOD.DISABLED, POST_HEADERS);

/** PUT request */
export const put = (endpoint, data) =>
	request('PUT', endpoint, data, CACHE_METHOD.DISABLED, POST_HEADERS);

/** DELETE request */
export const del = (endpoint) =>
	request('DELETE', endpoint);

// ─── Core request function ───────────────────────────────────────────

/**
 * Makes an authenticated API request to the Traccar backend.
 *
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (appended to BASE_API_URL)
 * @param {Object|null} data - Request body for POST/PUT
 * @param {number} cachingMethod - Cache strategy from CACHE_METHOD
 * @param {Object} additionalHeaders - Extra headers to merge
 * @param {string} cacheKey - Storage key, defaults to method + endpoint
 * @returns {Promise<{abort: boolean, error: any, data: any, status: number, response?: Response, cached?: boolean}>}
 */
export const request = async (
	method,
	endpoint,
	data = null,
	cachingMethod = CACHE_METHOD.DISABLED,
	additionalHeaders = {},
	cacheKey = `${method}${endpoint}`
) => {

	// ── Try cache first ──
	if (cachingMethod === CACHE_METHOD.PREFER_CACHE) {
		const cachedValue = await readCache(cacheKey);
		if (cachedValue) {
			debug('API', 'cache hit for', endpoint);
			return { abort: false, error: null, data: cachedValue, status: 200, cached: true };
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

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const options = {
		method,
		headers: { ...BASE_HEADERS, ...additionalHeaders },
		body: ['POST', 'PUT'].includes(method) ? JSON.stringify(data) : null,
		credentials: 'include',
		signal: controller.signal,
	};

	debug('API', method, `${BASE_API_URL}/${endpoint}`);

	let json = null;
	let abort = false;
	let error = null;
	let response;

	try {
		response = await fetch(`${BASE_API_URL}/${endpoint}`, options);
		// some endpoints (DELETE session, 204) answer with an empty body
		const text = await response.text();
		json = text ? JSON.parse(text) : null;
	} catch (ex) {
		abort = true;
		error = ex;
		warn('API', 'request failed', endpoint, ex?.message);
	} finally {
		clearTimeout(timeout);
	}

	// ── Offline: serve the last known copy ──
	if (cachingMethod === CACHE_METHOD.PREFER_NETWORK && !response) {
		const cachedValue = await readCache(cacheKey);
		if (cachedValue) {
			debug('API', 'offline, serving cache for', endpoint);
			return { abort: false, error, data: cachedValue, status: 200, cached: true };
		}
	}

	// ── Update cache on success ──
	if (cachingMethod !== CACHE_METHOD.DISABLED && !abort && response?.status === 200) {
		getStorage().setMap(cacheKey, json);
	}

	return {
		abort,
		error,
		data: json,
		status: response?.status || 0,
		response,
	};
};
