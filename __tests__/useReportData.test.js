import { act } from 'react-test-renderer';
import { cachedGet, CACHE_METHOD } from '../lib/request';
import { MONTH_PARTS, whichMonthPart } from '../lib/date';
import { useReportData } from '../lib/hooks/useReportData';
import { deferred, flush, renderHook } from './helpers/renderHook';

jest.mock('../lib/request', () => ({
	CACHE_METHOD: { PREFER_CACHE: 1, PREFER_NETWORK: 2, DISABLED: 3 },
	cachedGet: jest.fn(),
}));

const paramsOf = (call) => new URLSearchParams(call[0].split('?')[1]);
const trip = (startTime) => ({ startTime });

const render = (props) => renderHook((p) => useReportData(p), { reportType: 'trips', ...props });

describe('useReportData', () => {
	beforeEach(() => {
		cachedGet.mockReset();
		cachedGet.mockResolvedValue({ status: 200, data: [] });
	});

	it('starts with the partition containing today', async () => {
		const { unmount } = render({ deviceId: 1 });
		await flush();

		const params = paramsOf(cachedGet.mock.calls[0]);
		const now = new Date();
		expect(new Date(params.get('from')) <= now).toBe(true);
		expect(new Date(params.get('to')) > now).toBe(true);
		expect(params.get('deviceId')).toBe('1');
		unmount();
	});

	it('requests each partition at most once for an empty month and then settles', async () => {
		const { result, unmount } = render({ deviceId: 1 });
		await flush();

		// today's partition and every older one, never the future ones
		const expected = whichMonthPart(new Date()) + 1;
		expect(cachedGet).toHaveBeenCalledTimes(expected);
		expect(result.current.items).toEqual([]);
		expect(result.current.canLoadMore).toBe(false);

		// load-more at the start of the month is a no-op
		await act(async () => { await result.current.onEndReached(); });
		await flush(10);
		expect(cachedGet).toHaveBeenCalledTimes(expected);

		// a refresh reloads the loaded partitions once and stops (it used to loop forever)
		await act(async () => { await result.current.onRefresh(); });
		await flush(10);
		expect(cachedGet).toHaveBeenCalledTimes(expected * 2);
		unmount();
	});

	it('serves finished partitions from cache and fetches the open one', async () => {
		const { result, unmount } = render({ deviceId: 1 });
		await flush();
		cachedGet.mockClear();

		act(() => result.current.setMonth(new Date(2025, 8, 15)));
		await flush();

		// a past month starts at its last partition, all of them are finished
		expect(cachedGet).toHaveBeenCalledTimes(MONTH_PARTS);
		cachedGet.mock.calls.forEach((call) => {
			expect(call[1]).toBe(CACHE_METHOD.PREFER_CACHE);
			expect(call[2]).toBeUndefined();
		});

		cachedGet.mockClear();
		act(() => result.current.setMonth(new Date()));
		await flush();

		const [endpoint, method, cacheKey] = cachedGet.mock.calls[0];
		expect(method).toBe(CACHE_METHOD.PREFER_NETWORK);
		expect(cacheKey).toBe(`open:GET${endpoint}`);
		unmount();
	});

	it('loads older partitions on scroll and keeps items newest first', async () => {
		cachedGet.mockImplementation(async (endpoint) => {
			const from = new Date(new URLSearchParams(endpoint.split('?')[1]).get('from'));
			return { status: 200, data: [trip(new Date(+from + 3600e3).toISOString()), trip(new Date(+from + 7200e3).toISOString())] };
		});
		const { result, unmount } = render({ deviceId: 1 });
		await flush();

		act(() => result.current.setMonth(new Date(2025, 8, 15)));
		await flush();
		expect(result.current.items).toHaveLength(2);
		expect(result.current.canLoadMore).toBe(true);

		await act(async () => { await result.current.onEndReached(); });
		await flush();

		const times = result.current.items.map((t) => +new Date(t.startTime));
		expect(times).toHaveLength(4);
		expect(times).toEqual([...times].sort((a, b) => b - a));
		unmount();
	});

	it('replaces items with the refreshed partitions, flat and newest first', async () => {
		let version = 0;
		cachedGet.mockImplementation(async (endpoint) => {
			const from = new Date(new URLSearchParams(endpoint.split('?')[1]).get('from'));
			const at = (hours) => trip(new Date(+from + hours * 3600e3).toISOString());
			return { status: 200, data: version ? [at(1), at(2), at(3)] : [at(1), at(2)] };
		});
		const { result, unmount } = render({ deviceId: 1 });
		await flush();

		act(() => result.current.setMonth(new Date(2025, 8, 15)));
		await flush();
		await act(async () => { await result.current.onEndReached(); });
		await flush();
		expect(result.current.items).toHaveLength(4);

		version = 1;
		await act(async () => { await result.current.onRefresh(); });
		await flush();

		const { items } = result.current;
		expect(items).toHaveLength(6);
		items.forEach((item) => expect(typeof item.startTime).toBe('string'));
		const times = items.map((t) => +new Date(t.startTime));
		expect(times).toEqual([...times].sort((a, b) => b - a));
		expect(new Set(times).size).toBe(times.length);
		unmount();
	});

	it('drops responses that arrive after the device changed', async () => {
		const slow = deferred();
		cachedGet.mockImplementationOnce(() => slow.promise);
		const { result, rerender, unmount } = render({ deviceId: 1 });

		cachedGet.mockResolvedValue({ status: 200, data: [trip('2026-10-01T10:00:00Z')] });
		rerender({ reportType: 'trips', deviceId: 2 });
		await flush();

		slow.resolve({ status: 200, data: [trip('2026-10-02T10:00:00Z')] });
		await flush();

		expect(result.current.items).toEqual([trip('2026-10-01T10:00:00Z')]);
		unmount();
	});

	it('reports failures and recovers on reload', async () => {
		cachedGet.mockResolvedValue({ status: 500, data: null });
		const { result, unmount } = render({ deviceId: 1 });
		await flush();
		expect(result.current.error).toBeTruthy();

		cachedGet.mockResolvedValue({ status: 200, data: [trip('2026-10-01T10:00:00Z')] });
		act(() => result.current.reload());
		await flush();

		expect(result.current.error).toBeNull();
		expect(result.current.items).toHaveLength(1);
		unmount();
	});
});
