//
// Build a reader page for the sample article as the new datatype would serve it:
// semantic HTML, diagrams as SVG and formulas as MathML, no JavaScript, for the Lighthouse test.
//
import fs from 'node:fs';
import vm from 'node:vm';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';

const D = new URL('../data/', import.meta.url);
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('pele.global.js', D), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(new URL('temml.min.js', D), 'utf8'), ctx);
const md = new MarkdownIt({ html: true, typographer: false }).use(footnote);
const fence = md.renderer.rules.fence;
md.renderer.rules.fence = (t, i, o, e, s) => {
	const tok = t[i];
	if (tok.info.startsWith('mermaid')) {
		const svg = ctx.pele.render(tok.content, { fontFamily: 'Lato, Helvetica, Arial, sans-serif', fontSize: 15, responsive: true }).svg.replace('<svg ', '<svg role="img" aria-label="Tijdlijn van Bram Hoekstra in de gemeenteraad" ');
		return `<figure class="diagram">${svg}<figcaption>Tijdlijn van Bram Hoekstra in de gemeenteraad van Eemstad.</figcaption></figure>`;
	}
	return fence(t, i, o, e, s);
};
let body = fs.readFileSync(new URL('start.md', D), 'utf8')
	.replace(/^%%.*%%$/gm, '')
	.replace(/\$([^$\n]+?)\$/g, (m, tex) => ctx.temml.renderToString(tex))
	.replace(/^> \[!(quote|info)\][^\n]*\n((?:>.*\n?)+)/gm, (m, kind, rest) => `<aside class="callout ${kind}" aria-label="${kind === 'quote' ? 'Citaat' : 'Kader'}">\n\n${rest.replace(/^> ?/gm, '')}\n\n</aside>\n`)
	.replace(/^!\[[^\]]*\]\([^)]*\)\{[^}]*\}\n\*[^*]*\*\n/gm, '')
	.replace(/\[\[([^\]|]+)\]\]/g, '[$1](nl/$1)');
const html = md.render(body).replace(/<h3>/g, '<h3 id="x">');
const css = fs.readFileSync(new URL('../js/lezer.css', import.meta.url), 'utf8');
const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: 'Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur', author: { '@type': 'Person', name: 'Sanne de Vries' }, datePublished: '2026-10-27', inLanguage: 'nl', articleSection: 'Politiek en bestuur' };
fs.writeFileSync(process.argv[2], `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur – De Stadsbron</title>
<meta name="description" content="Twintig jaar lang vroeg Bram Hoekstra in de raad van Eemstad om openbare stukken en debatten. Nu neemt de fractievoorzitter van Open Eemstad afscheid.">
<link rel="preload" href="fonts/lora-regular.woff2" as="font" type="font/woff2" crossorigin>
<style>${css}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="site"><a href="./" class="logo">De Stadsbron</a><nav aria-label="Hoofdmenu"><a href="#">Onderzoek</a> <a href="#">Rubrieken</a> <a href="#">Opinie</a></nav></header>
<main>
<article>
<header><p class="kicker">Politiek en bestuur</p><h1>Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur</h1>
<p class="intro">Twintig jaar lang vroeg Bram Hoekstra in de raad van Eemstad om openbare stukken en debatten. Nu neemt de fractievoorzitter van Open Eemstad afscheid.</p>
<p class="byline">door Sanne de Vries · <time datetime="2026-10-27">27 oktober 2026</time> · leestijd 3 min</p></header>
${html}
<section class="bijsluiter" aria-label="Bijsluiter"><h2>Bijsluiter</h2><p>Sanne de Vries is politiek verslaggever. Dit artikel is een verzonnen voorbeeld.</p></section>
</article>
</main>
</body>
</html>`);
