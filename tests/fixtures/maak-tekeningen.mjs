//
// Draw the 36 diagram templates of the editor with Pele and a set of formulas with Temml, the way the editor does in
// the browser, as fixtures for the PHP tests of the filter and of saving (tests/markdown/). Development machine only.
//
// Usage: node tests/fixtures/maak-tekeningen.mjs   (after npm install in tools/bundel)
//
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../tools/bundel/', import.meta.url));
const pele = await import(new URL('../../tools/bundel/node_modules/pele/dist/pele.js', import.meta.url));
const temml = require('temml');
const { DIAGRAMS } = await import('../../system/mdeditor/diagrammen.js');
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

//
// The literal of a fenced block ends with a newline, as in league/commonmark and markdown-it.
//
const diagrams = DIAGRAMS.map(d => {
	const text = d.s + '\n';
	return { key: d.key, text, sha256: sha(text), svg: pele.render(text, { fontFamily: 'Lato, Helvetica, Arial, sans-serif', fontSize: 15, responsive: true }).svg };
});
const formulas = ['\\int_0^1 x^2\\,dx = \\tfrac{1}{3}', '\\frac{a+b}{c}', '\\sqrt[3]{x}', '\\sum_{i=1}^{n} i', '\\alpha \\leq \\beta', '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}', 'a^2+b^2=c^2', '\\tfrac{4}{37} \\approx 11\\%']
	.map(tex => ({ tex, sha256: sha(tex), inline: temml.renderToString(tex, { displayMode: false }), block: temml.renderToString(tex, { displayMode: true }) }));
fs.writeFileSync(new URL('tekeningen.json', import.meta.url), JSON.stringify({ pele: '1.10.1', temml: temml.version, diagrams, formulas }));
console.log(`${diagrams.length} diagrams, ${formulas.length} formulas, ${Math.round(fs.statSync(new URL('tekeningen.json', import.meta.url)).size / 1024)} kB`);
