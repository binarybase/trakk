import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { get } from '../request';
import { isBool } from '../util';
import { getTestDevice, getTestDevicePosition, useTestDevice } from '../testDevice';
import { createWebSocketManager } from '../websocket';
import { debug, error as logError, log } from '../logger';
import deviceStore from '../deviceStore';

const MODULE = 'Devices';

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
 */
const mergePositionsIntoDevices = (deviceList, positions) => {
	return deviceList
		.filter((d) => !d.disabled)
		.map((device) => {
			const position = positions.find((p) => p.deviceId === device.id);
			if (!position) return null;

			const enriched = {
				...device,
				position,
				identifier: String(device.id),
			};
			enriched.moving = isDeviceMoving(enriched);
			return enriched;
		})
		.filter(Boolean);
};

// ─── Context ─────────────────────────────────────────────────────────

const DevicesContext = createContext({ devices: [] });
export { DevicesContext };
export const useDevicesContext = () => useContext(DevicesContext);

/**
 * Provider hook for device state.
 * Uses WebSocket for real-time position & device updates from Traccar /api/socket.
 * Falls back to HTTP polling if WebSocket is unavailable.
 *
 * @param {string|null} token - Session token (from auth context)
 * @param {boolean} loggedIn - Whether user is authenticated
 */
export const useDevicesProvider = (token, loggedIn) => {
	const [devices, setDevices] = useState([]);
	const [currentDevice, setCurrentDevice] = useState();
	const [pinnedDevice, setPinnedDevice] = useState();
	const isTestEnabled = useTestDevice();

	// Keep a ref to latest devices / positions for WebSocket merges
	const devicesRef = useRef([]);
	const positionsRef = useRef([]);
	const wsManagerRef = useRef(null);
	const fallbackTimerRef = useRef(null);

	/**
	 * Full HTTP fetch of devices + positions (initial load & fallback).
	 */
	const fetchAll = useCallback(async () => {
		try {
			const [deviceRes, positionRes] = await Promise.all([get('devices'), get('positions')]);
			const deviceList = deviceRes?.data || [];
			const positions = positionRes?.data || [];

			if (isTestEnabled) {
				deviceList.push(getTestDevice());
				positions.push(getTestDevicePosition());
			}

			if (!deviceList.length || !positions.length) return null;

			devicesRef.current = deviceList;
			positionsRef.current = positions;

			const merged = mergePositionsIntoDevices(deviceList, positions);
			setDevices(merged);
			deviceStore.setDevices(merged);
			return merged;
		} catch (ex) {
			logError(MODULE, 'fetchAll exception', ex);
			return null;
		}
	}, [isTestEnabled]);

	// ─── WebSocket handlers ──────────────────────────────────────────

	const handleWsDevices = useCallback((updatedDevices) => {
		debug(MODULE, 'ws: devices update', updatedDevices.length);
		const current = [...devicesRef.current];

		for (const updated of updatedDevices) {
			const idx = current.findIndex((d) => d.id === updated.id);
			if (idx >= 0) {
				current[idx] = { ...current[idx], ...updated };
			} else {
				current.push(updated);
			}
		}

		devicesRef.current = current;
		const merged = mergePositionsIntoDevices(current, positionsRef.current);
		setDevices(merged);
		deviceStore.setDevices(merged);
	}, []);

	const handleWsPositions = useCallback((updatedPositions) => {
		debug(MODULE, 'ws: positions update', updatedPositions.length);
		const current = [...positionsRef.current];

		for (const updated of updatedPositions) {
			const idx = current.findIndex((p) => p.deviceId === updated.deviceId);
			if (idx >= 0) {
				current[idx] = updated;
			} else {
				current.push(updated);
			}
		}

		// Add test device position if enabled
		if (isTestEnabled) {
			const testPos = getTestDevicePosition();
			const testIdx = current.findIndex((p) => p.deviceId === 9999);
			if (testIdx >= 0) {
				current[testIdx] = testPos;
			} else {
				current.push(testPos);
			}
		}

		positionsRef.current = current;
		const merged = mergePositionsIntoDevices(devicesRef.current, current);
		setDevices(merged);
		deviceStore.setDevices(merged);
	}, [isTestEnabled]);

	// ─── WebSocket lifecycle ─────────────────────────────────────────

	useEffect(() => {
		if (!loggedIn || !token) {
			// Clean up when logged out
			if (wsManagerRef.current) {
				wsManagerRef.current.disconnect();
				wsManagerRef.current = null;
			}
			if (fallbackTimerRef.current) {
				clearInterval(fallbackTimerRef.current);
				fallbackTimerRef.current = null;
			}
			setDevices([]);
			return;
		}

		// Initial HTTP fetch
		fetchAll().then(() => {
			log(MODULE, 'initial fetch done');
		});

		// Start fallback polling immediately – WS will disable it if it connects
		fallbackTimerRef.current = setInterval(fetchAll, 10000);

		const ws = createWebSocketManager(token, {
			onDevices: handleWsDevices,
			onPositions: handleWsPositions,
			onEvents: (events) => {
				debug(MODULE, 'ws: events', events.length);
			},
			onOpen: () => {
				log(MODULE, 'ws: connected – stopping fallback polling');
				if (fallbackTimerRef.current) {
					clearInterval(fallbackTimerRef.current);
					fallbackTimerRef.current = null;
				}
			},
			onClose: () => {
				debug(MODULE, 'ws: disconnected');
				// Restart fallback polling while WS is reconnecting
				if (!fallbackTimerRef.current) {
					fallbackTimerRef.current = setInterval(fetchAll, 10000);
				}
			},
			onGaveUp: () => {
				log(MODULE, 'ws: gave up – using HTTP polling permanently');
				// Ensure polling is running
				if (!fallbackTimerRef.current) {
					fallbackTimerRef.current = setInterval(fetchAll, 10000);
				}
			},
		});

		ws.startAppStateListener();
		ws.connect();
		wsManagerRef.current = ws;

		return () => {
			ws.disconnect();
			wsManagerRef.current = null;
			if (fallbackTimerRef.current) {
				clearInterval(fallbackTimerRef.current);
				fallbackTimerRef.current = null;
			}
		};
	}, [loggedIn, token, isTestEnabled, fetchAll, handleWsDevices, handleWsPositions]);

	return {
		devices,
		fetchAll,
		currentDevice,
		setCurrentDevice,
		pinnedDevice,
		setPinnedDevice,
		isTestEnabled,
	};
};