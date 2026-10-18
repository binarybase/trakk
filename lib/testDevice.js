import { useStorage } from './storage';
import { positions } from './testPositions';

export const TEST_DEVICE_ID = 9999;
export const TEST_DEVICE_INTERVAL = 2000;

// -1 or 1 backward or forward
let direction = 1;
let currentIndex = 0;
let currentPosition = positions[0];

/**
 * moves the demo device one step along the recorded route, back and forth
 */
export const moveTestDevice = () => {
	if (currentIndex + direction < 0 || currentIndex + direction >= positions.length) {
		direction = -direction;
	}
	currentIndex += direction;

	const position = positions[currentIndex];
	currentPosition = {
		...position,
		fixTime: new Date().toISOString(),
		// the route is recorded in one direction, turn around on the way back
		course: direction < 0 ? (position.course + 180) % 360 : position.course,
	};
}

/**
 * demo device setting, off unless the user enables it in settings
 */
export const useTestDeviceSetting = () => useStorage('displayTestDevice', false);

export const getTestDevice = () => ({
	id: TEST_DEVICE_ID,
	name: 'TEST',
	status: 'online',
	lastUpdate: new Date().toISOString(),
	disabled: false,
});

export const getTestDevicePosition = () => currentPosition;
