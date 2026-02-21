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

/** After this many consecutive failures we stop retrying (server doesn't support WS) */
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
 * MAX_CONSECUTIVE_FAILURES attempts and call handlers.onGaveUp().
 *
 * @param {string} token - JSESSIONID session cookie
 * @param {Object} handlers - { onDevices, onPositions, onEvents, onOpen, onClose, onError, onGaveUp }
 * @returns {{ connect, disconnect, isConnected, hasGivenUp }}
 */
export const createWebSocketManager = (token, handlers = {}) => {
	let ws = null;
	let reconnectTimer = null;
	let heartbeatTimer = null;
	let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
	let intentionalClose = false;
	let appStateSubscription = null;
	let consecutiveFailures = 0;
	let givenUp = false;

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

	const scheduleReconnect = () => {
		if (intentionalClose || givenUp) return;

		// Check if we should give up
		if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
			givenUp = true;
			warn(MODULE, `gave up after ${consecutiveFailures} consecutive failures – falling back to HTTP polling`);
			handlers.onGaveUp?.();
			return;
		}

		clearTimers();
		debug(MODULE, `scheduling reconnect in ${reconnectDelay}ms (attempt ${consecutiveFailures + 1}/${MAX_CONSECUTIVE_FAILURES})`);
		reconnectTimer = setTimeout(() => {
			connect();
		}, reconnectDelay);

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
		// Close existing connection if any
		if (ws) {
			try { ws.close(); } catch (e) { /* ignore */ }
			ws = null;
		}

		if (!token) {
			warn(MODULE, 'no token, skipping connect');
			return;
		}

		if (givenUp) {
			debug(MODULE, 'already gave up, skipping connect');
			return;
		}

		intentionalClose = false;

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

		const url = getUrl();
		debug(MODULE, 'connecting to', url);

		try {
			ws = new WebSocket(url);

			ws.onopen = () => {
				log(MODULE, 'connected');
				consecutiveFailures = 0;
				reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				startHeartbeat();
				handlers.onOpen?.();
			};

			ws.onmessage = handleMessage;

			ws.onclose = (e) => {
				debug(MODULE, 'closed', e.code, e.reason);
				clearTimers();

				// Count consecutive failures (code 1006 = abnormal closure / never opened)
				if (e.code !== 1000) {
					consecutiveFailures++;
				}

				handlers.onClose?.(e);
				scheduleReconnect();
			};

			ws.onerror = (e) => {
				error(MODULE, 'error', e.message);
				handlers.onError?.(e);
			};
		} catch (e) {
			error(MODULE, 'connection exception', e);
			consecutiveFailures++;
			scheduleReconnect();
		}
	};

	const disconnect = () => {
		intentionalClose = true;
		clearTimers();
		if (appStateSubscription) {
			appStateSubscription.remove();
			appStateSubscription = null;
		}
		if (ws) {
			try { ws.close(); } catch (e) { /* ignore */ }
			ws = null;
		}
		debug(MODULE, 'disconnected');
	};

	const isConnected = () => ws?.readyState === WebSocket.OPEN;
	const hasGivenUp = () => givenUp;

	// Pause/resume on app state changes
	const startAppStateListener = () => {
		appStateSubscription = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active' && !isConnected() && !intentionalClose && !givenUp) {
				debug(MODULE, 'app became active, reconnecting');
				reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				consecutiveFailures = 0;
				connect();
			} else if (nextState === 'background') {
				debug(MODULE, 'app went to background, disconnecting');
				disconnect();
				// Allow reconnect when coming back
				intentionalClose = false;
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
