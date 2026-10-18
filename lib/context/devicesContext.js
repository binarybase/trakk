import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { get, put } from '../request';
import { isBool } from '../util';
import { getTestDevice, getTestDevicePosition, moveTestDevice, TEST_DEVICE_INTERVAL, useTestDeviceSetting } from '../testDevice';
import { createWebSocketManager } from '../websocket';
import { debug, error as logError, log } from '../logger';
import deviceStore from '../deviceStore';

const MODULE = 'Devices';
const POLLING_INTERVAL = 10000;

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Determines whether a device is currently in motion.
 */
export const isDeviceMoving = (device) => {
	const position = device?.position;
	if (!position || !position.valid || position.outdated) return false;

	const fixTime = +new Date(position.fixTime);
	const now = Date.now();
	const hasIgnition = isBool(position.attributes?.ignition);
	const isIgnitionOn = position.attributes?.ignition === true;
	const isRecent = (now - fixTime) / 1000 < 30;
	const hasSpeed = position.speed > 0;

	return isRecent && hasSpeed && (isIgnitionOn || !hasIgnition);
};

/**
 * Merges positions into a device list, computing moving state and identifiers.
 * Disabled devices and devices that never reported a position are left out.
 */
export const mergePositionsIntoDevices = (deviceList, positions) => {
	const positionByDevice = new Map(positions.map((p) => [p.deviceId, p]));

	return deviceList
		.filter((d) => !d.disabled && positionByDevice.has(d.id))
		.map((device) => {
			const enriched = {
				...device,
				position: positionByDevice.get(device.id),
				identifier: String(device.id),
			};
			enriched.moving = isDeviceMoving(enriched);
			return enriched;
		});
};

/**
 * Returns a copy of list with updates applied, matched by key.
 * Unknown items are appended.
 */
export const upsert = (list, updates, keyFn, mergeFn = (_, updated) => updated) => {
	const result = [...list];
	for (const updated of updates) {
		const idx = result.findIndex((item) => keyFn(item) === keyFn(updated));
		if (idx >= 0) {
			result[idx] = mergeFn(result[idx], updated);
		} else {
			result.push(updated);
		}
	}
	return result;
};

// ─── Context ─────────────────────────────────────────────────────────

const DevicesContext = createContext({ devices: [] });
export { DevicesContext };
export const useDevicesContext = () => useContext(DevicesContext);

/**
 * Live device by id, or undefined once it is gone.
 */
export const useDevice = (id) => {
	const { devices } = useDevicesContext();
	return useMemo(() => devices.find((d) => d.id === id), [devices, id]);
};

/**
 * Provider hook for device state.
 * Uses WebSocket for real-time position & device updates from Traccar /api/socket.
 * Falls back to HTTP polling if WebSocket is unavailable.
 *
 * Selection is kept as device ids, so selected devices are always the live objects.
 *
 * @param {string|null} token - Session token (from auth context)
 * @param {boolean} loggedIn - Whether user is authenticated
 */
export const useDevicesProvider = (token, loggedIn) => {
	const [devices, setDevices] = useState([]);
	const [currentDeviceId, setCurrentDeviceId] = useState(null);
	const [pinnedDeviceId, setPinnedDeviceId] = useState(null);
	const [isTestEnabled] = useTestDeviceSetting();

	// Devices and positions exactly as the server sent them
	const devicesRef = useRef([]);
	const positionsRef = useRef([]);
	const testEnabledRef = useRef(isTestEnabled);
	const fallbackTimerRef = useRef(null);

	/**
	 * Merges the latest server state (plus the demo device) and publishes it.
	 */
	const publish = useCallback(() => {
		let deviceList = devicesRef.current;
		let positions = positionsRef.current;

		if (testEnabledRef.current) {
			deviceList = [...deviceList, getTestDevice()];
			positions = [...positions, getTestDevicePosition()];
		}

		const merged = mergePositionsIntoDevices(deviceList, positions);
		setDevices(merged);
		deviceStore.setDevices(merged);
	}, []);

	/**
	 * Full HTTP fetch of devices + positions (initial load & fallback).
	 * Keeps the last known state when either request fails.
	 */
	const fetchAll = useCallback(async () => {
		try {
			const [deviceRes, positionRes] = await Promise.all([get('devices'), get('positions')]);
			if (deviceRes.status !== 200 || positionRes.status !== 200) {
				debug(MODULE, 'fetchAll failed', deviceRes.status, positionRes.status);
				return false;
			}

			devicesRef.current = deviceRes.data || [];
			positionsRef.current = positionRes.data || [];
			publish();
			return true;
		} catch (ex) {
			logError(MODULE, 'fetchAll exception', ex);
			return false;
		}
	}, [publish]);

	/**
	 * Saves device fields on the server.
	 * Traccar replaces the whole device on PUT, so the full server copy is sent;
	 * a partial body would reset group, attributes, category, contact and expiration.
	 *
	 * @returns {Promise<boolean>} success
	 */
	const updateDevice = useCallback(async (id, changes) => {
		const original = devicesRef.current.find((d) => d.id === id);
		if (!original) return false;

		const response = await put(`devices/${id}`, { ...original, ...changes });
		if (response.status !== 200) {
			logError(MODULE, 'updateDevice failed', id, response.status);
			return false;
		}

		// apply right away instead of waiting for the websocket echo
		devicesRef.current = upsert(devicesRef.current, [response.data || { ...original, ...changes }], (d) => d.id);
		publish();
		return true;
	}, [publish]);

	const currentDevice = useMemo(
		() => devices.find((d) => d.id === currentDeviceId),
		[devices, currentDeviceId]
	);
	const pinnedDevice = useMemo(
		() => devices.find((d) => d.id === pinnedDeviceId),
		[devices, pinnedDeviceId]
	);
	const setCurrentDevice = useCallback((device) => setCurrentDeviceId(device?.id ?? null), []);
	const setPinnedDevice = useCallback((device) => setPinnedDeviceId(device?.id ?? null), []);

	// ─── WebSocket handlers ──────────────────────────────────────────

	const handleWsDevices = useCallback((updatedDevices) => {
		debug(MODULE, 'ws: devices update', updatedDevices.length);
		devicesRef.current = upsert(devicesRef.current, updatedDevices, (d) => d.id, (current, updated) => ({ ...current, ...updated }));
		publish();
	}, [publish]);

	const handleWsPositions = useCallback((updatedPositions) => {
		debug(MODULE, 'ws: positions update', updatedPositions.length);
		positionsRef.current = upsert(positionsRef.current, updatedPositions, (p) => p.deviceId);
		publish();
	}, [publish]);

	// ─── Demo device ─────────────────────────────────────────────────

	useEffect(() => {
		testEnabledRef.current = isTestEnabled;
		if (!loggedIn) return;

		// reflect the setting right away
		publish();
		if (!isTestEnabled) return;

		const timer = setInterval(() => {
			moveTestDevice();
			publish();
		}, TEST_DEVICE_INTERVAL);
		return () => clearInterval(timer);
	}, [loggedIn, isTestEnabled, publish]);

	// ─── WebSocket lifecycle ─────────────────────────────────────────

	useEffect(() => {
		if (!loggedIn || !token) {
			// Clean up when logged out
			devicesRef.current = [];
			positionsRef.current = [];
			setDevices([]);
			deviceStore.setDevices([]);
			setCurrentDeviceId(null);
			setPinnedDeviceId(null);
			return;
		}

		const startPolling = () => {
			if (!fallbackTimerRef.current) {
				fallbackTimerRef.current = setInterval(fetchAll, POLLING_INTERVAL);
			}
		};
		const stopPolling = () => {
			if (fallbackTimerRef.current) {
				clearInterval(fallbackTimerRef.current);
				fallbackTimerRef.current = null;
			}
		};

		// Initial HTTP fetch
		fetchAll().then(() => {
			log(MODULE, 'initial fetch done');
		});

		// Start fallback polling immediately – WS will disable it if it connects
		startPolling();

		const ws = createWebSocketManager(token, {
			onDevices: handleWsDevices,
			onPositions: handleWsPositions,
			onEvents: (events) => {
				debug(MODULE, 'ws: events', events.length);
			},
			onOpen: () => {
				log(MODULE, 'ws: connected – stopping fallback polling');
				stopPolling();
			},
			onClose: () => {
				debug(MODULE, 'ws: disconnected');
				// Restart fallback polling while WS is reconnecting
				startPolling();
			},
			onGaveUp: () => {
				log(MODULE, 'ws: gave up – using HTTP polling');
				startPolling();
			},
		});

		ws.startAppStateListener();
		ws.connect();

		return () => {
			ws.disconnect();
			stopPolling();
		};
	}, [loggedIn, token, fetchAll, handleWsDevices, handleWsPositions]);

	return useMemo(() => ({
		devices,
		fetchAll,
		updateDevice,
		currentDevice,
		setCurrentDevice,
		pinnedDevice,
		setPinnedDevice,
		isTestEnabled,
	}), [devices, fetchAll, updateDevice, currentDevice, setCurrentDevice, pinnedDevice, setPinnedDevice, isTestEnabled]);
};
