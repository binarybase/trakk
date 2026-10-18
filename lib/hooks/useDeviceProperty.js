import { useEffect, useRef, useState } from "react"
import { debug } from "../logger";
import { alert } from "../alert";
import { useDevicesContext } from "../context/devicesContext";

const BUFFER_DELAY = 1000;
const MODULE = 'useDeviceProperty';

/**
 * editable device field, saved to the server after the user stops typing
 * @param {Object} device
 * @param {String} property
 * @returns {Array} [ value, setValue ]
 */
export const useDeviceProperty = (device, property) => {
	// textInput value that changes immediatelly
	const [ value, setValue ] = useState(device[property] ?? '');
	const savedRef = useRef(device[property] ?? '');
	const { updateDevice } = useDevicesContext();
	const deviceId = device.id;

	useEffect(() => {
		if (value === savedRef.current) {
			return;
		}

		const timer = setTimeout(async () => {
			debug(MODULE, 'saving', property, 'deviceId', deviceId);
			if (await updateDevice(deviceId, { [property]: value })) {
				savedRef.current = value;
				return;
			}

			// restore original value when failed
			setValue(savedRef.current);
			alert('Uložení změny selhalo');
		}, BUFFER_DELAY);

		return () => clearTimeout(timer);
	}, [ value, deviceId, property, updateDevice ]);

	return [ value, setValue ];
}
