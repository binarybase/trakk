
// excluded modules from output
const DEBUG_EXCLUDE = ['API', 'Auth'];
const DEBUG_ENABLED = true;
const DEBUG_LEVEL1 = true;
const DEBUG_LEVEL2 = true;

const logOutput = (method, name, args) => console[method](`[${name}]`, ...args);
const isExcluded = (name) => DEBUG_EXCLUDE.includes(name);

export const debug = (name, ...args) => {
	if(!DEBUG_ENABLED || !DEBUG_LEVEL2 || isExcluded(name)) return;
	logOutput('debug', name, args);
}

export const log = (name, ...args) => {
	if(!DEBUG_ENABLED || !DEBUG_LEVEL1) return;
	logOutput('log', name, args);
}

export const warn = (name, ...args) => logOutput('warn', name, args);
export const error = (name, ...args) => logOutput('error', name, args);