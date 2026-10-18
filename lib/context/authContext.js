import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BASE_API_URL, BASE_HOST, del, get } from '../request';
import { isEmpty } from '../util';
import CookieManager from '@react-native-cookies/cookies';
import { getStorage } from '../storage';
import { error, debug, warn, log } from '../logger';
import { AppState } from 'react-native';

// ─── Auth result codes ───────────────────────────────────────────────
export const AUTH_STATUS = {
	SUCCESS: 200,
	INVALID_CREDENTIALS: 401,
	REQUEST_FAILED: 0,
	NETWORK_ERROR: -1,
};

const MODULE = 'Auth';

// ─── Session check interval (ms) ─────────────────────────────────────
const SESSION_CHECK_INTERVAL = 60000; // 60s (WebSocket handles real-time now)
const OFFLINE_CHECK_INTERVAL = 10000;
const LOGIN_TIMEOUT_MS = 30000;

// ─── Singleton token accessor (needed by request.js outside React tree) ──
let _token = null;

export const getCurrentAuthToken = () => _token;

// ─── Persistence ─────────────────────────────────────────────────────
// logged in state is derived from the stored token
const EMPTY_SESSION = { token: null, userEmail: '' };

const readSession = () => {
	const storage = getStorage();
	const session = {
		token: storage.getString('token') || null,
		userEmail: storage.getString('userEmail') || '',
	};
	_token = session.token;
	return session;
};

const writeSession = ({ token, userEmail }) => {
	const storage = getStorage();
	if (token) {
		storage.setString('token', token);
	} else {
		storage.removeItem('token');
	}
	if (userEmail) {
		storage.setString('userEmail', userEmail);
	} else {
		storage.removeItem('userEmail');
	}
	// flag used by older versions
	storage.removeItem('loggedIn');
	_token = token;
};

// ─── Context ─────────────────────────────────────────────────────────
const AuthContext = createContext({});
export const useAuthContext = () => useContext(AuthContext);
export { AuthContext };

/**
 * Auth provider hook – must be called once in a top-level component
 * that renders <AuthContext.Provider value={...}>.
 *
 * A stored session is trusted on launch so the app opens without waiting
 * for the network; it is validated in the background and dropped on 401.
 */
export const useAuthProvider = () => {
	const [session, setSession] = useState(readSession);
	const [online, setOnline] = useState(true);
	const checkingRef = useRef(false);
	const loggedIn = !!session.token;

	const saveSession = useCallback((next) => {
		writeSession(next);
		setSession(next);
	}, []);

	/**
	 * Validates current session against Traccar API.
	 * @returns {Promise<boolean|null>} validity, null when it could not be determined
	 */
	const checkSession = useCallback(async () => {
		if (checkingRef.current || !_token) return null;
		checkingRef.current = true;

		try {
			debug(MODULE, 'checkSession');
			const response = await get('session');

			switch (response.status) {
				case 200:
					setOnline(true);
					return true;
				case 401:
				case 403:
				case 404:
					log(MODULE, 'session expired, status', response.status);
					setOnline(true);
					saveSession(EMPTY_SESSION);
					return false;
				default:
					// network failure or server error: keep the session and retry later
					warn(MODULE, 'checkSession failed, status', response.status);
					setOnline(false);
					return null;
			}
		} catch (ex) {
			error(MODULE, 'checkSession exception', ex);
			setOnline(false);
			return null;
		} finally {
			checkingRef.current = false;
		}
	}, [saveSession]);

	/**
	 * Authenticates user with email and password via Traccar session API.
	 */
	const authStrategy = useCallback(async (inputEmail, inputPw) => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

		try {
			const queryString = new URLSearchParams({
				language: 'cs',
				email: inputEmail,
				password: inputPw,
			});

			const response = await fetch(`${BASE_API_URL}/session`, {
				method: 'POST',
				body: String(queryString),
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
					Host: BASE_HOST,
				},
				credentials: 'include',
				signal: controller.signal,
			});

			if (response.status === 401 || response.status === 403) {
				return AUTH_STATUS.INVALID_CREDENTIALS;
			}

			if (response.status !== 200) {
				error(MODULE, 'login status', response.status);
				return AUTH_STATUS.REQUEST_FAILED;
			}

			const cookies = await CookieManager.get(BASE_API_URL);
			const cookie = cookies?.JSESSIONID?.value;
			if (isEmpty(cookie)) {
				error(MODULE, 'login response without cookie');
				return AUTH_STATUS.REQUEST_FAILED;
			}

			setOnline(true);
			saveSession({ token: cookie, userEmail: inputEmail });
			log(MODULE, 'logged in');
			return AUTH_STATUS.SUCCESS;
		} catch (ex) {
			error(MODULE, 'login exception', ex);
			return String(ex).includes('Network request failed') || ex?.name === 'AbortError'
				? AUTH_STATUS.NETWORK_ERROR
				: AUTH_STATUS.REQUEST_FAILED;
		} finally {
			clearTimeout(timeout);
		}
	}, [saveSession]);

	/**
	 * Logs out: ends the server session and clears all stored data.
	 */
	const logout = useCallback(() => {
		log(MODULE, 'logout');
		// the server session is ended in the background so logout never waits on the network;
		// request() reads the token synchronously, before it is cleared below
		del('session').finally(() => CookieManager.clearAll().catch(() => {}));

		const storage = getStorage();
		storage.clearStore();
		storage.clearMemoryCache();
		saveSession(EMPTY_SESSION);
	}, [saveSession]);

	// ─── Session validation: on launch, on resume and periodically ──
	useEffect(() => {
		if (!loggedIn) return;

		checkSession();
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') checkSession();
		});
		const timer = setInterval(checkSession, online ? SESSION_CHECK_INTERVAL : OFFLINE_CHECK_INTERVAL);

		return () => {
			subscription.remove();
			clearInterval(timer);
		};
	}, [loggedIn, online, checkSession]);

	return useMemo(() => ({
		loggedIn,
		userEmail: session.userEmail,
		token: session.token,
		online,
		authStrategy,
		checkSession,
		logout,
	}), [loggedIn, session, online, authStrategy, checkSession, logout]);
};
