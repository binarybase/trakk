/**
 * Shared device data store (pub/sub).
 * Bridges device state between the main React tree and CarPlay's separate root.
 * The main app's devicesContext publishes updates here;
 * CarPlay (or any other consumer) subscribes for changes.
 */

let _devices = [];
const _listeners = new Set();

const deviceStore = {
	getDevices: () => _devices,

	setDevices: (devices) => {
		_devices = devices;
		_listeners.forEach((fn) => fn(devices));
	},

	/**
	 * Subscribe to device updates.
	 * @param {Function} listener - called with the new devices array
	 * @returns {Function} unsubscribe
	 */
	subscribe: (listener) => {
		_listeners.add(listener);
		return () => _listeners.delete(listener);
	},
};

export default deviceStore;
