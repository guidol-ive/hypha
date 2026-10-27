//
// Bundle the browser libraries of the Markdown editor once, on the development machine (decision T9): one ES module
// per library with its version in the name, in system/mdeditor/vendor/, plus the licence texts. Nothing of this runs
// at installation or on the server.
//
// Usage: sh system/mdeditor/vendor/bundel.sh   (runs npm ci and this script)
//
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(here, '../../system/mdeditor/vendor');
const version = p => JSON.parse(fs.readFileSync(path.join(here, 'node_modules', p, 'package.json'), 'utf8')).version;
fs.rmSync(path.join(out, 'LICENSES'), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'LICENSES'), { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith('.js')) fs.unlinkSync(path.join(out, f));

const used = new Set(['pele', 'temml']);
const bundles = [
	['codemirror', '@codemirror/view', 'src/codemirror.js', []],
	['prosemirror', 'prosemirror-view', 'src/prosemirror.js', ['markdown-it']],
	['markdown-it', 'markdown-it', 'src/markdown-it.js', []],
	['dompurify', 'dompurify', 'src/dompurify.js', []],
	['highlight', 'highlight.js', 'src/highlight.js', []],
];
for (const [name, pkg, entry, external] of bundles) {
	const file = `${name}-${version(pkg)}.js`;
	const r = await esbuild.build({ entryPoints: [path.join(here, entry)], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: path.join(out, file), external, metafile: true, legalComments: 'none' });
	const packages = new Set(Object.keys(r.metafile.inputs).map(i => (i.match(/node_modules\/((@[^/]+\/)?[^/]+)/) || [])[1]).filter(Boolean));
	packages.forEach(p => used.add(p));
	console.log(`${file}: ${Object.keys(r.metafile.inputs).length} modules, ${packages.size} packages, ${Math.round(fs.statSync(path.join(out, file)).size / 1024)} kB`);
}
//
// Pele and Temml ship one ES module each; they are copied as they are.
//
fs.copyFileSync(path.join(here, 'node_modules/pele/dist/pele.js'), path.join(out, `pele-${version('pele')}.js`));
fs.copyFileSync(path.join(here, 'node_modules/temml/dist/temml.mjs'), path.join(out, `temml-${version('temml')}.js`));
console.log(`pele-${version('pele')}.js, temml-${version('temml')}.js copied`);

//
// Licence texts of every package that ends up in a bundle.
//
const licences = [];
for (const dir of fs.readdirSync(path.join(here, 'node_modules')).flatMap(d => d.startsWith('@') ? fs.readdirSync(path.join(here, 'node_modules', d)).map(s => `${d}/${s}`) : [d])) {
	if (!used.has(dir)) continue;
	const json = path.join(here, 'node_modules', dir, 'package.json');
	if (!fs.existsSync(json)) continue;
	const meta = JSON.parse(fs.readFileSync(json, 'utf8'));
	const text = fs.readdirSync(path.join(here, 'node_modules', dir)).find(f => /^licen[cs]e/i.test(f));
	licences.push(`${dir} ${meta.version} ${meta.license}`);
	if (text) fs.copyFileSync(path.join(here, 'node_modules', dir, text), path.join(out, 'LICENSES', dir.replace('/', '_') + '.txt'));
}
fs.writeFileSync(path.join(out, 'LICENSES/README.txt'), 'Licences of the browser libraries in system/mdeditor/vendor/, used by the Markdown editor of Hypha.\nDOMPurify is dual licensed (MPL-2.0 or Apache-2.0); Hypha uses it under Apache-2.0.\n\n' + licences.join('\n') + '\n');
const bad = licences.filter(l => !/ (MIT|BSD-[23]-Clause|ISC|Apache-2\.0|\(MPL-2\.0 OR Apache-2\.0\)|MPL-2\.0 OR Apache-2\.0)$/.test(l));
console.log(bad.length ? 'NOT PERMISSIVE: ' + bad.join(', ') : `${licences.length} packages, all permissive`);
