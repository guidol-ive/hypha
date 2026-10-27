//
// Minimal test framework for the unit pages: test() registers, done() runs and publishes window.hyphaTestResult.
//
const tests = [];
export function test(name, fn) { tests.push([name, fn]); }
export function same(expected, actual, message = '') {
	if (expected !== actual) throw new Error((message ? message + ': ' : '') + 'expected ' + JSON.stringify(expected).slice(0, 400) + ', got ' + JSON.stringify(actual).slice(0, 400));
}
export function check(condition, message = 'condition is false') { if (!condition) throw new Error(message); }
//
// First line that differs between two texts, for readable failures of round-trip tests.
//
export function diffLine(a, b) {
	const x = a.split('\n'), y = b.split('\n');
	for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return `line ${i + 1}: ${JSON.stringify(x[i])} <> ${JSON.stringify(y[i])}`;
	return '';
}
export async function done() {
	const results = [];
	for (const [name, fn] of tests) {
		const t = performance.now();
		try { await fn(); results.push([name, true, '', performance.now() - t]); }
		catch (e) { results.push([name, false, String(e && e.message || e), performance.now() - t]); }
	}
	window.hyphaTestResult = { passed: results.filter(r => r[1]).length, failed: results.filter(r => !r[1]).length, results };
}
