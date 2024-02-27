import { createContext, useContext, useState, useEffect } from 'react';
import { BASE_API_URL, BASE_HOST, get } from '../request';
import { isEmpty } from '../util';
import CookieManager from '@react-native-cookies/cookies';
import { useStorage, getStorage } from '../storage';
import { error, debug, warn, log } from '../logger';
import { AppState } from 'react-native';

export const AUTH_STATUS = {
	SUCCESS: 200,
	INVALID_CREDENTIALS: 401,
	REQUEST_FAILED: 0,
	NETWORK_ERROR: -1
}

let currentValue = {};
const AuthContext = createContext(currentValue);
const MODULE = 'Auth';

export const getCurrentAuthToken = () => currentValue?.loggedIn === true ? currentValue?.token : null;
export const useAuthContext = () => useContext(AuthContext);
export const createAuthContext = () => {
	// async storage state
	const [ connectionFailed, setConnectionFailed ] = useState(false);
	const [ connected, setConnected ] = useState(false);
	const [ userEmail, setUserEmail ] = useStorage('userEmail', '');
	const [ loggedIn, setLoggedIn ] = useStorage('loggedIn', false);
	const [ token, setToken ] = useStorage('token', null);

	// resets state
	const resetState = () => {
		setUserEmail('');
		setLoggedIn(false);
		setToken(null);
	}

	// checks session with existing token
	const checkSession = async () => {
		// try to check existing session
		debug(MODULE, 'checkSession: against token', token);
		try {
			const response = await get('session');
			switch(response?.status){
				case 200:
					debug(MODULE, 'check session success');
					setConnected(true);
					return true;
				// expired forbidden
				case 401:
				case 403:
				case 404:
					setConnected(true);
					resetState();
					log(MODULE, 'check session expired, status', response?.status);
					return false;

				// server unavailable or server internal error
				default:
					error(MODULE, 'checkSession: status ', response?.status, response?.data);
					setConnected(false);
					return null;
			}
		} catch(ex){
			error(MODULE, 'checkSession: exception', ex);
			if((''+ex).includes('Network request failed')){
				warn(MODULE, 'checkSession: network failed', ex);
				setConnected(false);
				return null;
			}
		}

		debug(MODULE, 'checkSession: session does not exists');

		return false;
	}

	// performs authentication against form
	const authStrategy = async (inputEmail, inputPw) => {
		setUserEmail(null);
		setToken(null);
		setLoggedIn(false);

		try {
			const queryString = new URLSearchParams({
				language: 'cs',
				email: inputEmail,
				password: inputPw
			});

			const response = await fetch(`${BASE_API_URL}/session`, {
				method: 'POST',
				body: ''+queryString,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
					'Host': BASE_HOST
				},
				credentials: 'include'
			});

			const cookies = await CookieManager.get(BASE_API_URL);
			//response.headers.forEach((k, v) => log(MODULE, k, v));
			//log(MODULE, await response.text());
			//log(MODULE, 'url cookies', cookies);

			switch(response.status){
				case 200:
					const cookie = cookies?.JSESSIONID?.value;
					if(!cookie || isEmpty(cookie)){
						error(MODULE, 'login response without cookie');
						return AUTH_STATUS.REQUEST_FAILED;
					}

					setUserEmail(inputEmail);
					setToken(cookie);
					setLoggedIn(true);
					setConnected(true);

					log(MODULE, 'logged in', inputEmail, 'cookie', cookie);
					return AUTH_STATUS.SUCCESS;
				default:
					error(MODULE, 'login status', response.status, 'text', await response.text());
					return AUTH_STATUS.INVALID_CREDENTIALS;
			}
		} catch(ex){
			error(MODULE, 'login exception', ex);

			if((''+ex).includes('Network request failed')){
				return AUTH_STATUS.NETWORK_ERROR;
			}

			return AUTH_STATUS.REQUEST_FAILED;
		}
	}

	const logout = () => {
		const storage = getStorage();
		storage.clearStore();
		storage.clearMemoryCache();
		setLoggedIn(false);
		setUserEmail(null);
		setToken(null);
	}

	// check session at first on init
	useEffect(() => {
		const subscription = AppState.addEventListener('change', checkSession);
		// check at startup
		checkSession();

		return () => {
			subscription.remove();
		}
	}, []);

	// periodically check session (when logged in property changes)
	useEffect(() => {
		if(!loggedIn) return;

		const timer = setInterval(checkSession, 10000);
		return () => clearInterval(timer);
	}, [ loggedIn ]);

	currentValue = {
		loggedIn,
		userEmail,
		token,
		authStrategy,
		checkSession,
		connected,
		setConnected,
		connectionFailed,
		setConnectionFailed,
		logout
	}

	return {
		AuthContext,
		...currentValue
	};
}

// JSESSIONID=node01ko0v2rps3ref1cckg1a1v9nfe25.node0; Path=/; Secure
const COOKIE_REGEX = /^JSESSIONID=([^;]+);/;
const parseAuthCookie = (v) => {
	log(MODULE, 'parseAuthCookie', v);

	const matches = COOKIE_REGEX.exec(v);
	log(MODULE, 'matches', matches);
	return matches && matches.length > 0 ? matches[1] : null;
}