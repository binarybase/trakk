import TestRenderer, { act } from 'react-test-renderer';

/**
 * renders a hook inside a probe component, result.current holds its latest return value
 */
export const renderHook = (hook, initialProps = {}) => {
	const result = { current: null };
	const Probe = (props) => {
		result.current = hook(props);
		return null;
	};

	let renderer;
	act(() => {
		renderer = TestRenderer.create(<Probe {...initialProps} />);
	});

	return {
		result,
		rerender: (props) => act(() => renderer.update(<Probe {...props} />)),
		unmount: () => act(() => renderer.unmount()),
	};
};

/**
 * lets pending promises settle and flushes resulting renders
 */
export const flush = async (rounds = 5) => {
	for (let i = 0; i < rounds; i++) {
		await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
	}
};

/**
 * promise that is resolved from the outside
 */
export const deferred = () => {
	let resolve;
	const promise = new Promise((r) => { resolve = r; });
	return { promise, resolve };
};
