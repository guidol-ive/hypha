//
// Render the 36 diagram templates of the prototype with Pele and a few formulas with Temml,
// as input for the filter experiment on the server.
//
import fs from 'node:fs';
import vm from 'node:vm';

const D = new URL('../data/', import.meta.url);
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('pele.global.js', D), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(new URL('temml.min.js', D), 'utf8'), ctx);
const proto = fs.readFileSync(new URL('../../prototype/index.html', import.meta.url), 'utf8');
const diagrams = eval(proto.match(/const DIAGRAMS = (\[[\s\S]*?\n\]);/)[1]);
fs.mkdirSync(new URL('svg/', D), { recursive: true });
diagrams.forEach((d, i) => fs.writeFileSync(new URL(`svg/${String(i + 1).padStart(2, '0')}.svg`, D), ctx.pele.render(d.s, { fontFamily: 'Lato, Helvetica, Arial, sans-serif', fontSize: 15, responsive: true }).svg));
const formulas = ['\\int_0^1 x^2\\,dx = \\tfrac{1}{3}', '\\frac{a+b}{c}', '\\sqrt[3]{x}', '\\sum_{i=1}^{n} i', '\\alpha \\leq \\beta', '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}', 'a^2+b^2=c^2', '\\tfrac{4}{37} \\approx 11\\%'];
fs.writeFileSync(new URL('math.html', D), formulas.map(f => ctx.temml.renderToString(f, { displayMode: true })).join('\n'));
console.log(diagrams.length + ' diagrammen, ' + formulas.length + ' formules');
