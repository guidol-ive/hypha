//
// Browser tests of the Markdown editor in headless Chrome, on the development machine only.
//
// 1. Unit pages, tests/browser/unit/*.html: plain JavaScript test pages served from the repository by a small static
//    server; each page sets window.hyphaTestResult to {passed, failed, results: [[name, ok, message, ms]]}.
// 2. End-to-end modules, tests/browser/e2e/*.mjs: each exports a default async function (t) that drives the editor in
//    a running Hypha at t.base, with t.test(name, fn) per test.
//
// Usage: node tests/browser/run.mjs [hypha base url] [filter ...]
//
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const base = (process.argv[2] || '').replace(/\/$/, '') + '/';
const filters = process.argv.slice(3);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };

//
// Static server for the unit pages: the repository root, read-only.
//
const server = http.createServer((req, res) => {
	const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
	if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
	res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
	fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const stat = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let passed = 0, failed = 0, known = 0;
const fixed = [];
const started = Date.now();
function report(name, ok, message, ms) {
	if (ok) { passed++; console.log(`ok    ${name.padEnd(70)} ${String(Math.round(ms)).padStart(6)} ms`); }
	else { failed++; console.log(`FAIL  ${name}\n      ${message}`); }
}
//
// A test of a known bug (tests/bekend/fouten.ndjson) is expected to fail on an assertion (an error named
// AssertionFailure) until its issue is solved; a pass means the issue is probably solved, any other error that the
// test itself is broken.
//
function reportKnown(issue, name, error) {
	if (!error) { fixed.push(issue); console.log(`FIXED? #${String(issue).padEnd(5)} ${name}: passes, so issue #${issue} is probably solved`); }
	else if (error.name === 'AssertionFailure') { known++; console.log(`known #${String(issue).padEnd(5)} ${name}: ${String(error.message).slice(0, 120)}`); }
	else report(name + ` (known bug #${issue}, but not an assertion)`, false, (error.stack || String(error)).split('\n').slice(0, 4).join('\n      '));
}
const wanted = name => !filters.length || filters.some(f => name.includes(f));

for (const f of process.env.E2E ? [] : fs.readdirSync(path.join(root, 'tests/browser/unit')).filter(f => f.endsWith('.html')).sort()) {
	if (!wanted(f)) continue;
	const page = await browser.newPage();
	const errors = [];
	page.on('pageerror', e => errors.push(String(e)));
	page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
	page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(r.status() + ' ' + r.url()); });
	await page.goto(stat + 'tests/browser/unit/' + f);
	try {
		for (let t = 0; !(await page.evaluate(() => !!window.hyphaTestResult)); t += 100) {
			if (errors.some(e => /SyntaxError|ReferenceError|TypeError/.test(e)) && t > 2000) throw new Error('page error: ' + errors[0]);
			if (t > 120000) throw new Error('no result after 120 s');
			await new Promise(r => setTimeout(r, 100));
		}
		const r = await page.evaluate(() => window.hyphaTestResult);
		for (const [name, ok, message, ms, issue, kind] of r.results) {
			if (issue) reportKnown(issue, `${f}: ${name}`, ok ? null : Object.assign(new Error(message), { name: kind }));
			else report(`${f}: ${name}`, ok, message, ms);
		}
	}
	catch (e) { report(f, false, String(e)); }
	if (errors.length) report(`${f}: no errors in the console`, false, errors.slice(0, 5).join('\n      '));
	await page.close();
}

//
// The end-to-end modules: tests/browser/e2e, or another folder in E2E (tests/bekend/browser for known bugs).
//
const e2e = path.resolve(root, process.env.E2E || 'tests/browser/e2e');
if (process.argv[2]) {
	for (const f of fs.readdirSync(e2e).filter(f => f.endsWith('.mjs')).sort()) {
		if (!wanted(f)) continue;
		const mod = await import(path.join(e2e, f));
		if (typeof mod.default !== 'function') continue;
		const tests = [];
		await mod.default({ browser, base, stat, root, test: (name, fn) => tests.push([name, fn, 0]), knownBug: (issue, name, fn) => tests.push([name, fn, issue]) });
		for (const [name, fn, issue] of tests) {
			const t = Date.now();
			if (issue) {
				try { await fn(); reportKnown(issue, `${f}: ${name}`, null); }
				catch (e) { reportKnown(issue, `${f}: ${name}`, e); }
				continue;
			}
			try { await fn(); report(`${f}: ${name}`, true, '', Date.now() - t); }
			catch (e) { report(`${f}: ${name}`, false, (e && e.stack || String(e)).split('\n').slice(0, 4).join('\n      ')); }
		}
	}
}
await browser.close();
server.close();
const extra = known || fixed.length ? `, ${known} known bugs, ${fixed.length} fixed? (${fixed.map(n => '#' + n).join(' ')})` : '';
console.log(`\nbrowser: ${passed + failed + known + fixed.length} tests, ${passed} passed, ${failed} failed${extra}, ${((Date.now() - started) / 1000).toFixed(1)} s`);
process.exit(failed || fixed.length ? 1 : 0);
