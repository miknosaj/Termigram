const DEBUG = process.argv.includes('--debug');

export function debug(...args) {
    if (DEBUG) {
        const ts = new Date().toISOString().slice(11, 23);
        console.error(`[termigram ${ts}]`, ...args);
    }
}

export { DEBUG };
