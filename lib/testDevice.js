import { useEffect } from 'react';
import { useStorage } from './storage';
import { positions } from './testPositions';

// -1 or 1 backward or forward
let direction = 1,
	currentPosition = positions[0],
	currentIndex = 0;

const positionsCount = positions.length;
let task;

/**
 * iterate infinite
 */
const moveTestDevice = () => {
	// get position at current index and direction
	currentPosition = positions[currentIndex];
	currentIndex += direction;

	// something failed... reset position
	if(!currentPosition){
		direction = 1;
		currentIndex = 0;
		return;
	}

	// replace with current time
	currentPosition.fixTime = (new Date()).toISOString();
	currentPosition.course -= direction < 0 ? 180 : 0;
	
	// reached end, opposite direction
	if(currentIndex > positionsCount - 1){
		// swap direction
		direction = -1;
		currentIndex = positionsCount - 1;
	}

	// reached start, swap direction
	if(currentIndex < 0){
		currentIndex = 0;
		direction = 1;
	}
}

export const useTestDevice = () => {
	const [ displayTestDevice ] = useStorage("displayTestDevice", true);
	
	useEffect(() => {
		if(!displayTestDevice){
			task && clearInterval(task);
			return;
		}

		task = setInterval(moveTestDevice, 2000);
		return () => {
			task && clearInterval(task);
		}
	}, [ displayTestDevice ]);

	return displayTestDevice;
}

export const getTestDevice = () => {
	return {
		id: 9999,
		name: 'TEST',
		status: 'online',
		lastUpdate: (new Date()).toISOString(),
		disabled: false,
		identifier: '9999'
	}
}

export const getTestDevicePosition = () => currentPosition;
