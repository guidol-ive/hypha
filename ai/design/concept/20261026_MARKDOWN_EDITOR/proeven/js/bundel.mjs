//
// Bundle each candidate once with esbuild into browser/, the way the libraries would be shipped:
// one versioned file per library, built on the development machine, no build step at installation.
//
import esbuild from 'esbuild';
import fs from 'node:fs';

const out = new URL('../browser/', import.meta.url).pathname;
for (const e of ['cm', 'mk', 'mk2', 'pm', 'mdit', 'td']) {
	const r = await esbuild.build({ entryPoints: [`src/${e}.js`], bundle: true, minify: true, format: 'iife', outfile: `${out}${e}.js`, metafile: true, loader: { '.css': 'empty' } });
	const inputs = Object.keys(r.metafile.inputs);
	const packages = new Set(inputs.map(i => (i.match(/node_modules\/((@[^/]+\/)?[^/]+)/) || [])[1]).filter(Boolean));
	console.log(`${e}: ${inputs.length} modules, ${packages.size} pakketten`);
}
const docs = {};
for (const f of ['start.md', 'plaktest.md', 'kenmerken.md']) docs[f] = fs.readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8');
fs.writeFileSync(`${out}docs.js`, 'window.DOCS = ' + JSON.stringify(docs) + ';\n');
