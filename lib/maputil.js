/**
 * region showing all points
 * @param {Array} points - [{ latitude, longitude }], routes can have tens of thousands
 * @returns {Object|null}
 */
export function getRegionForCoordinates(points) {
	if (!points?.length) {
		return null;
	}

	let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
	for (const { latitude, longitude } of points) {
		minX = Math.min(minX, latitude);
		maxX = Math.max(maxX, latitude);
		minY = Math.min(minY, longitude);
		maxY = Math.max(maxY, longitude);
	}

	return {
		latitude: (minX + maxX) / 2,
		longitude: (minY + maxY) / 2,
		latitudeDelta: (maxX - minX) + 0.01,
		longitudeDelta: (maxY - minY) + 0.01
	};
}
