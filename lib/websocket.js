import { AppState } from 'react-native';
import CookieManager from '@react-native-cookies/cookies';
import { BASE_URL } from './request';
import { debug, error, log, warn } from './logger';

const MODULE = 'WebSocket';

/**
 * Reconnection config
 */
const INITIAL_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 60000;

/** After this many consecutive failures we stop retrying until the app is resumed */
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * WebSocket message types from Traccar /api/socket
 * The server sends JSON with keys: devices, positions, events
 */
export const WS_EVENT = {
	DEVICES: 'devices',
	POSITIONS: 'positions',
	EVENTS: 'events',
};

/**
 * Creates a managed WebSocket connection to Traccar's /api/socket endpoint.
 * Handles automatic reconnection, heartbeat, and AppState-aware lifecycle.
 *
 * If the server consistently rejects the connection (e.g. 503 behind a proxy
 * that doesn't support WS upgrades) the manager will give up after
 * MAX_CONSECUTIVE_FAILURES attempts and call handlers.onGaveUp(). It tries
 * again from scratch the next time the app becomes active.
 *
 * @param {string} token - JSESSIONID session cookie
 * @param {Object} handlers - { onDevices, onPositions, onEvents, onOpen, onClose, onError, onGaveUp }
 * @returns {{ connect, disconnect, isConnected, hasGivenUp, startAppStateListener }}
 */
export const createWebSocketManager = (token, handlers = {}) => {
	let ws = null;
	let reconnectTimer = null;
	let heartbeatTimer = null;
	let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
	let appStateSubscription = null;
	let consecutiveFailures = 0;
	let givenUp = false;
	// set by disconnect(); the manager can't be reused afterwards
	let stopped = false;

	const getUrl = () => {
		const wsBase = BASE_URL.replace(/^http/, 'ws');
		return `${wsBase}/api/socket`;
	};

	const clearTimers = () => {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
	};

	const startHeartbeat = () => {
		heartbeatTimer = setInterval(() => {
			if (ws?.readyState === WebSocket.OPEN) {
				try {
					ws.send('');
				} catch (e) {
					warn(MODULE, 'heartbeat send failed', e);
				}
			}
		}, HEARTBEAT_INTERVAL_MS);
	};

	/**
	 * Closes the current socket without treating it as a failure.
	 */
	const closeSocket = () => {
		clearTimers();
		if (!ws) return;
		const socket = ws;
		ws = null;
		socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
		try { socket.close(); } catch (e) { /* ignore */ }
	};

	const scheduleReconnect = () => {
		if (stopped || givenUp) return;

		if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
			givenUp = true;
			warn(MODULE, `gave up after ${consecutiveFailures} consecutive failures – falling back to HTTP polling`);
			handlers.onGaveUp?.();
			return;
		}

		clearTimers();
		debug(MODULE, `scheduling reconnect in ${reconnectDelay}ms (attempt ${consecutiveFailures + 1}/${MAX_CONSECUTIVE_FAILURES})`);
		reconnectTimer = setTimeout(connect, reconnectDelay);

		// Exponential backoff with cap
		reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
	};

	const handleMessage = (event) => {
		try {
			const data = JSON.parse(event.data);

			if (data.devices && handlers.onDevices) {
				handlers.onDevices(data.devices);
			}
			if (data.positions && handlers.onPositions) {
				handlers.onPositions(data.positions);
			}
			if (data.events && handlers.onEvents) {
				handlers.onEvents(data.events);
			}
		} catch (e) {
			error(MODULE, 'failed to parse message', e, event.data);
		}
	};

	const connect = async () => {
		closeSocket();

		if (!token) {
			warn(MODULE, 'no token, skipping connect');
			return;
		}

		if (stopped || givenUp) {
			debug(MODULE, 'stopped or gave up, skipping connect');
			return;
		}

		// Ensure session cookie is set so the WebSocket handshake picks it up
		try {
			await CookieManager.set(BASE_URL, {
				name: 'JSESSIONID',
				value: token,
				path: '/',
			});
		} catch (e) {
			warn(MODULE, 'failed to set cookie before WS connect', e);
		}

		// disconnected, or another connect won the race, while the cookie was being set
		if (stopped || ws) return;

		const url = getUrl();
		debug(MODULE, 'connecting to', url);

		try {
			const socket = new WebSocket(url);
			ws = socket;

			socket.onopen = () => {
				log(MODULE, 'connected');
				consecutiveFailures = 0;
				reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				startHeartbeat();
				handlers.onOpen?.();
			};

			socket.onmessage = handleMessage;

			socket.onclose = (e) => {
				debug(MODULE, 'closed', e.code, e.reason);
				ws = null;
				clearTimers();

				// Count consecutive failures (code 1006 = abnormal closure / never opened)
				if (e.code !== 1000) {
					consecutiveFailures++;
				}

				handlers.onClose?.(e);
				scheduleReconnect();
			};

			socket.onerror = (e) => {
				error(MODULE, 'error', e.message);
				handlers.onError?.(e);
			};
		} catch (e) {
			error(MODULE, 'connection exception', e);
			consecutiveFailures++;
			scheduleReconnect();
		}
	};

	/**
	 * Tears the manager down for good.
	 */
	const disconnect = () => {
		stopped = true;
		if (appStateSubscription) {
			appStateSubscription.remove();
			appStateSubscription = null;
		}
		closeSocket();
		debug(MODULE, 'disconnected');
	};

	const isConnected = () => ws?.readyState === WebSocket.OPEN;
	const hasGivenUp = () => givenUp;

	// Pause/resume on app state changes
	const startAppStateListener = () => {
		appStateSubscription = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active' && !stopped && !ws) {
				debug(MODULE, 'app became active, reconnecting');
				reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				consecutiveFailures = 0;
				givenUp = false;
				connect();
			} else if (nextState === 'background' && ws) {
				// suspended sockets go stale; consumers fall back to polling, which
				// keeps CarPlay updated while the app runs in the background
				debug(MODULE, 'app went to background, closing');
				closeSocket();
				handlers.onClose?.({ code: 1000, reason: 'background' });
			}
		});
	};

	return {
		connect,
		disconnect,
		isConnected,
		hasGivenUp,
		startAppStateListener,
	};
};
