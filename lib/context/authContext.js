import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BASE_API_URL, BASE_HOST, get } from '../request';
import { isEmpty } from '../util';
import CookieManager from '@react-native-cookies/cookies';
import { useStorage, getStorage } from '../storage';
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

// ─── Singleton token accessor (needed by request.js outside React tree) ──
let _token = null;
let _loggedIn = false;

export const getCurrentAuthToken = () => (_loggedIn ? _token : null);

// ─── Context ─────────────────────────────────────────────────────────
const AuthContext = createContext({});
export const useAuthContext = () => useContext(AuthContext);
export { AuthContext };

// ─── Session check interval (ms) ─────────────────────────────────────
const SESSION_CHECK_INTERVAL = 60000; // 60s (WebSocket handles real-time now)

/**
 * Auth provider hook – must be called once in a top-level component
 * that renders <AuthContext.Provider value={...}>.
 */
export const useAuthProvider = () => {
	const [connectionFailed, setConnectionFailed] = useState(false);
	const [connected, setConnected] = useState(false);
	const [userEmail, setUserEmail] = useStorage('userEmail', '');
	const [loggedIn, setLoggedIn] = useStorage('loggedIn', false);
	const [token, setToken] = useStorage('token', null);
	const checkingRef = useRef(false);

	// Keep singleton in sync
	useEffect(() => {
		_token = token;
		_loggedIn = loggedIn;
	}, [token, loggedIn]);

	const resetState = useCallback(() => {
		setUserEmail('');
		setLoggedIn(false);
		setToken(null);
	}, []);

	/**
	 * Validates current session against Traccar API.
	 */
	const checkSession = useCallback(async () => {
		if (checkingRef.current) return null;
		checkingRef.current = true;

		try {
			debug(MODULE, 'checkSession');
			const response = await get('session');

			switch (response?.status) {
				case 200:
					debug(MODULE, 'session valid');
					setConnected(true);
					return true;
				case 401:
				case 403:
				case 404:
					setConnected(true);
					resetState();
					log(MODULE, 'session expired, status', response?.status);
					return false;
				default:
					error(MODULE, 'checkSession unexpected status', response?.status);
					setConnected(false);
					return null;
			}
		} catch (ex) {
			error(MODULE, 'checkSession exception', ex);
			if (String(ex).includes('Network request failed')) {
				setConnected(false);
				return null;
			}
		} finally {
			checkingRef.current = false;
		}

		return false;
	}, [resetState]);

	/**
	 * Authenticates user with email and password via Traccar session API.
	 */
	const authStrategy = useCallback(async (inputEmail, inputPw) => {
		setUserEmail(null);
		setToken(null);
		setLoggedIn(false);

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
			});

			const cookies = await CookieManager.get(BASE_API_URL);

			if (response.status === 200) {
				const cookie = cookies?.JSESSIONID?.value;
				if (!cookie || isEmpty(cookie)) {
					error(MODULE, 'login response without cookie');
					return AUTH_STATUS.REQUEST_FAILED;
				}

				setUserEmail(inputEmail);
				setToken(cookie);
				setLoggedIn(true);
				setConnected(true);

				log(MODULE, 'logged in', inputEmail);
				return AUTH_STATUS.SUCCESS;
			}

			error(MODULE, 'login status', response.status);
			return AUTH_STATUS.INVALID_CREDENTIALS;
		} catch (ex) {
			error(MODULE, 'login exception', ex);
			return String(ex).includes('Network request failed')
				? AUTH_STATUS.NETWORK_ERROR
				: AUTH_STATUS.REQUEST_FAILED;
		}
	}, []);

	/**
	 * Logs out: clears session and all stored data.
	 */
	const logout = useCallback(() => {
		const storage = getStorage();
		storage.clearStore();
		storage.clearMemoryCache();
		setLoggedIn(false);
		setUserEmail(null);
		setToken(null);
	}, []);

	// ─── Initial session check + AppState listener ──
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') checkSession();
		});
		checkSession();
		return () => subscription.remove();
	}, [checkSession]);

	// ─── Periodic session heartbeat (backup for WebSocket) ──
	useEffect(() => {
		if (!loggedIn) return;
		const timer = setInterval(checkSession, SESSION_CHECK_INTERVAL);
		return () => clearInterval(timer);
	}, [loggedIn, checkSession]);

	return {
		loggedIn,
		userEmail,
		token,
		authStrategy,
		checkSession,
		connected,
		setConnected,
		connectionFailed,
		setConnectionFailed,
		logout,
	};
};