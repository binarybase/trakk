import { useEffect, useState } from "react"
import { put } from "../request";
import { debug, error } from "../logger";

const BUFFER_DELAY = 1000;
const MODULE = 'useDeviceProperty';

export const useDeviceProperty = (device, property) => {
	// textInput value that changes immediatelly
	const [ value, setValue ] = useState(device[property]);

	const setPropertyViaAPI = async () => {
		// same value
		if(value === device[property]){
			return;
		}

		// object to be changed on server
		let toBeChanged = {
			// copy needed properties
			id: device.id,
			uniqueId: device.uniqueId,
			phone: device.phone,
			model: device.model,
			name: device.name
		};
		toBeChanged[property] = value;

		debug(MODULE, "toBeChanged", toBeChanged);

		// send property via API
		try {
			const response = (await put(`devices/${device.id}`, toBeChanged));
			debug(MODULE, "PUT property", property, "status", response?.status, response?.response);
			// change only when succeeded and value has been changed
			if(response?.status === 200 && response[property] !== value){
				// update original value
				device[property] = value;
				return;
			}
		} catch(ex){
			error(MODULE, "PUT property", property, "deviceId", device.id, "failed", ex);
		}

		// restore original value when failed
		setValue(device[property]);
	}

	// setup new value to change it with API after timeout
	useEffect(() => {
		const timer = setTimeout(() => {
			setPropertyViaAPI();
		}, BUFFER_DELAY)
		return () => {
			clearTimeout(timer)
		}
	}, [ value ]);

	return [ value, setValue ];
}