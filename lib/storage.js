import { confirm } from './alert';
import { useCallback, useEffect, useState } from 'react';
import { MMKVLoader, useMMKVStorage } from 'react-native-mmkv-storage';
const storage = new MMKVLoader().initialize();

/**
 * hook for storage items
 * @param {String} key
 * @param {String} value
 * @returns {Array}
 */
export const useStorage = (key, value) => useMMKVStorage(key, storage, value);
export const getStorage = () => storage;

/**
 * calculates object size for cache key
 * @param {String} k
 * @returns {Integer}
 */
const getKeySize = async (k) => {
	try {
		return JSON.stringify(await storage.getMapAsync(k))?.length || 0;
	} catch(ex){}

	return 0;
}

/**
 * calculates size of cache
 * @returns {Promise<Object>}
 */
const calculateSize = async () => {
	const keys = await storage.indexer.maps.getKeys();
	const sizes = await Promise.all(keys.map(getKeySize));

	return {
		size: sizes.reduce((prev, next) => prev + next, 0),
		itemsCount: keys.length
	}
}

/**
 * clears cache items
 * @returns {Promise}
 */
const clearCache = async () => {
	const keys = await storage.indexer.maps.getKeys();
	keys.forEach(k => storage.removeItem(k));
}

// bump to drop cached data written by older versions
const CACHE_VERSION = 2;

/**
 * clears the cache once after an update that changed what is cached
 * (v1 cached report ranges that were still in progress)
 * @returns {Promise}
 */
export const migrateCache = async () => {
	if (storage.getInt('cacheVersion') === CACHE_VERSION) {
		return;
	}
	await clearCache();
	storage.setInt('cacheVersion', CACHE_VERSION);
}

/**
 * cache hook
 * @returns {Object}
 */
export const useCache = () => {
	const [ info, setInfo ] = useState();
	const calculate = useCallback(() => { calculateSize().then(setInfo) }, []);
	const clear = useCallback(async () => {
		try {
			await confirm({
				title: 'Vyčištění mezipaměti',
				message: 'Tato akce vymaže mezipaměť vozidel a knihy jízd'
			});
		} catch(ex){
			// cancelled
			return;
		}
		await clearCache();
		calculate();
	}, [calculate]);

	useEffect(calculate, [calculate]);

	return {
		info,
		clear
	}
}
