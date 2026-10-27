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
let passed = 0, failed = 0;
const started = Date.now();
function report(name, ok, message, ms) {
	if (ok) { passed++; console.log(`ok    ${name.padEnd(70)} ${String(Math.round(ms)).padStart(6)} ms`); }
	else { failed++; console.log(`FAIL  ${name}\n      ${message}`); }
}
const wanted = name => !filters.length || filters.some(f => name.includes(f));

for (const f of fs.readdirSync(path.join(root, 'tests/browser/unit')).filter(f => f.endsWith('.html')).sort()) {
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
		for (const [name, ok, message, ms] of r.results) report(`${f}: ${name}`, ok, message, ms);
	}
	catch (e) { report(f, false, String(e)); }
	if (errors.length) report(`${f}: no errors in the console`, false, errors.slice(0, 5).join('\n      '));
	await page.close();
}

if (process.argv[2]) {
	for (const f of fs.readdirSync(path.join(root, 'tests/browser/e2e')).filter(f => f.endsWith('.mjs')).sort()) {
		if (!wanted(f)) continue;
		const mod = await import(path.join(root, 'tests/browser/e2e', f));
		const tests = [];
		await mod.default({ browser, base, stat, root, test: (name, fn) => tests.push([name, fn]) });
		for (const [name, fn] of tests) {
			const t = Date.now();
			try { await fn(); report(`${f}: ${name}`, true, '', Date.now() - t); }
			catch (e) { report(`${f}: ${name}`, false, (e && e.stack || String(e)).split('\n').slice(0, 4).join('\n      ')); }
		}
	}
}
await browser.close();
server.close();
console.log(`\nbrowser: ${passed + failed} tests, ${passed} passed, ${failed} failed, ${((Date.now() - started) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
