import { act } from 'react-test-renderer';
import { get, put } from '../lib/request';
import deviceStore from '../lib/deviceStore';
import {
	isDeviceMoving,
	mergePositionsIntoDevices,
	upsert,
	useDevicesProvider,
} from '../lib/context/devicesContext';
import { flush, renderHook } from './helpers/renderHook';

jest.mock('../lib/request', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('../lib/testDevice', () => ({
	useTestDeviceSetting: () => [false],
	getTestDevice: jest.fn(),
	getTestDevicePosition: jest.fn(),
	moveTestDevice: jest.fn(),
	TEST_DEVICE_INTERVAL: 2000,
}));
jest.mock('../lib/websocket', () => ({
	createWebSocketManager: () => ({ connect: jest.fn(), disconnect: jest.fn(), startAppStateListener: jest.fn() }),
}));

const SERVER_DEVICE = {
	id: 1,
	name: 'Octavia',
	uniqueId: '3567',
	phone: '+420',
	model: '1AB 2345',
	groupId: 7,
	calendarId: 3,
	contact: 'Jana',
	category: 'car',
	expirationTime: '2027-01-01T00:00:00Z',
	attributes: { speedLimit: 50 },
	disabled: false,
};
const POSITION = {
	deviceId: 1,
	latitude: 49,
	longitude: 14,
	speed: 20,
	valid: true,
	outdated: false,
	attributes: { ignition: true },
	fixTime: new Date().toISOString(),
};

describe('mergePositionsIntoDevices', () => {
	it('attaches positions and leaves out disabled and positionless devices', () => {
		const merged = mergePositionsIntoDevices(
			[SERVER_DEVICE, { id: 2, disabled: true }, { id: 3 }],
			[POSITION, { ...POSITION, deviceId: 2 }]
		);

		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ id: 1, identifier: '1', position: POSITION, moving: true });
	});
});

describe('isDeviceMoving', () => {
	const device = (position) => ({ position: { ...POSITION, ...position } });

	it('needs a recent fix with speed', () => {
		expect(isDeviceMoving(device({}))).toBe(true);
		expect(isDeviceMoving(device({ speed: 0 }))).toBe(false);
		expect(isDeviceMoving(device({ fixTime: new Date(Date.now() - 60000).toISOString() }))).toBe(false);
	});

	it('respects ignition when the device reports it', () => {
		expect(isDeviceMoving(device({ attributes: { ignition: false } }))).toBe(false);
		expect(isDeviceMoving(device({ attributes: {} }))).toBe(true);
	});
});

describe('upsert', () => {
	it('replaces matching items and appends new ones', () => {
		const list = [{ id: 1, a: 1 }, { id: 2, a: 2 }];
		expect(upsert(list, [{ id: 2, a: 3 }, { id: 4 }], (x) => x.id)).toEqual([{ id: 1, a: 1 }, { id: 2, a: 3 }, { id: 4 }]);
		expect(list[1].a).toBe(2);
	});
});

describe('useDevicesProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		get.mockImplementation(async (endpoint) => ({
			status: 200,
			data: endpoint === 'devices' ? [SERVER_DEVICE] : [POSITION],
		}));
	});

	const render = async () => {
		const hook = renderHook(() => useDevicesProvider('token', true));
		await flush();
		return hook;
	};

	it('loads devices and publishes them to the shared store', async () => {
		const { result, unmount } = await render();

		expect(result.current.devices.map((d) => d.id)).toEqual([1]);
		expect(deviceStore.getDevices()).toBe(result.current.devices);
		unmount();
	});

	it('sends the full device on update so Traccar keeps the other fields', async () => {
		put.mockResolvedValue({ status: 200, data: { ...SERVER_DEVICE, name: 'Fabia' } });
		const { result, unmount } = await render();

		let ok;
		await act(async () => {
			ok = await result.current.updateDevice(1, { name: 'Fabia' });
		});

		expect(ok).toBe(true);
		expect(put).toHaveBeenCalledWith('devices/1', { ...SERVER_DEVICE, name: 'Fabia' });
		expect(result.current.devices[0].name).toBe('Fabia');
		unmount();
	});

	it('reports failed updates and keeps the device unchanged', async () => {
		put.mockResolvedValue({ status: 400, data: null });
		const { result, unmount } = await render();

		let ok;
		await act(async () => {
			ok = await result.current.updateDevice(1, { name: '' });
		});

		expect(ok).toBe(false);
		expect(result.current.devices[0].name).toBe('Octavia');
		unmount();
	});

	it('keeps the selected device live as updates arrive', async () => {
		const { result, unmount } = await render();

		act(() => result.current.setCurrentDevice(result.current.devices[0]));
		get.mockImplementation(async (endpoint) => ({
			status: 200,
			data: endpoint === 'devices' ? [SERVER_DEVICE] : [{ ...POSITION, latitude: 50 }],
		}));
		await act(() => result.current.fetchAll());

		expect(result.current.currentDevice.position.latitude).toBe(50);
		unmount();
	});

	it('keeps the last known state when a refresh fails', async () => {
		const { result, unmount } = await render();

		get.mockResolvedValue({ status: 0, data: null });
		await act(() => result.current.fetchAll());

		expect(result.current.devices).toHaveLength(1);
		unmount();
	});
});
