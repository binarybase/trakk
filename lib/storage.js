import { confirm } from './alert';
import { useEffect, useState } from 'react';
import { MMKVLoader, useMMKVStorage } from 'react-native-mmkv-storage';
import { isArray, isObject } from './util';
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
		return JSON.stringify(await storage.getMapAsync(k))?.length;
	} catch(ex){}
	
	return 0;
}

/**
 * calculates size of cache
 * @returns {Promise<Object>}
 */
const calculateSize = async () => {
	const keys = await storage.indexer.maps.getKeys();
	const promises = keys.map(k => getKeySize(k));
	const size = (await Promise.all(promises)).reduce((prev, next) => prev + next, 0);
	const itemsCount = promises.length;

	return {
		size,
		itemsCount
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

/**
 * cache hook
 * @returns {Object}
 */
export const useCache = () => {
	const [ info, setInfo ] = useState();
	const calculate = () => { calculateSize().then(setInfo) };
	const clear = async () => {
		try {
			await confirm({
				title: 'Vyčištění mezipaměti',
				message: 'Tato akce vymaže mezipaměť vozidel a knihy jízd'
			});
			// do cleaning
			clearCache();
			// give some time for clearing
			setTimeout(calculate, 1000);
		} catch(ex){}
	}

	useEffect(calculate, [ ]);

	return {
		info,
		clear
	}
}