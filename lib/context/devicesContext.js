import { createContext, useContext, useState } from 'react';
import { get } from '../request';
import { isBool } from '../util';
import { getTestDevice, getTestDevicePosition, useTestDevice } from '../testDevice';

let currentValue = {};

export const isDeviceMoving = (device) => {
	const position = device.position;
	const fixTime = +new Date(position.fixTime);
	const now = +new Date();
	const hasIgnition = isBool(position?.attributes?.ignition);
	const isIgnitionOn = position?.attributes?.ignition === true;

	/*console.log({
		attributes: position.attributes,
		id: device.id,
		valid: position.valid,
		outdated: position.outdated,
		speed: position.speed,
		isIgnitionOn,
		hasIgnition
	})*/

	return position && position.valid && !position.outdated && ((now - fixTime) / 1000 < 30) && position.speed > 0 && (isIgnitionOn || !hasIgnition || (hasIgnition && position.speed > 0));
}

export const DevicesContext = createContext({
	devices: []
});
export const useDevicesContext = () => useContext(DevicesContext);
export const createDevicesContext = () => {
	const [ devices, setDevices ] = useState([]);
	const [ currentDevice, setCurrentDevice ] = useState();
	const [ pinnedDevice, setPinnedDevice ] = useState();
	const isTestEnabled = useTestDevice();

	/**
	 * fetches devices from server and display their current location
	 */
	const update = async () => {
		// fetch locations and assign to devices
		try {
			const deviceList = (await get('devices'))?.data || [];
			const positions = (await get('positions'))?.data || [];

			// add test demo device
			if(isTestEnabled){
				deviceList.push(getTestDevice());
				positions.push(getTestDevicePosition());
			}

			// no data returned or invalid
			if(!deviceList || !deviceList.length || !positions || !positions.length){
				return null;
			}

			// map positions to devices
			for(let i = 0, len = deviceList.length; i < len; i++){
				const device = deviceList[i];
				// skip disabled devices
				if(device.disabled === true)
					continue;

				const position = positions.find(p => p.deviceId === device.id);
				// skip devices without positions
				if(!position)
					continue;

				// assign position to device
				device.position = position;
				// assign marker identifier
				device.identifier = ''+device.id;
				// is moving?
				device.moving = isDeviceMoving(device);
			}

			// update device list
			setDevices(deviceList.filter(d => d.position));
			// return new state
			return deviceList;

		} catch(ex){
			console.error("devicesContext: exception", ex);
			return null;
		}
	}

	currentValue = {
		DevicesContext,
		devices,
		update,
		currentDevice,
		setCurrentDevice,
		pinnedDevice,
		setPinnedDevice,
		isTestEnabled
	}


	return {...currentValue};
}