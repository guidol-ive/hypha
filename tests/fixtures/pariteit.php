<?php
	//
	// Cases of the parity test (design section 13.4.2): Markdown with every Hypha extension. maak-pariteit.php writes the
	// HTML of league/commonmark for each case; tests/browser/unit/pariteit.test.html renders the same with markdown-it.
	// Interactive blocks are left out: the server inserts them after the filter.
	//
	return [
		'start' => file_get_contents(__DIR__ . '/../markdown/data/start.md'),
		'kenmerken' => file_get_contents(__DIR__ . '/../markdown/data/kenmerken.md'),
		'plaktest' => file_get_contents(__DIR__ . '/../markdown/data/plaktest.md'),
		'basis' => "### Kop\n\n**vet** *schuin* `code` [link](https://www.example.org) ![x](a.png \"titel\")\n\n- a\n- b\n\n1. een\n2. twee\n\n> citaat\n\n---\n\nregel  \nbreuk",
		'gfm' => "| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |\n\n~~weg~~ en https://www.example.org/x\n\n- [ ] open\n- [x] klaar",
		'kaders' => "> [!info] Open Eemstad in het kort\n> Lokale partij.\n\n> [!quote] Citaat\n> Een uitspraak\n\n> [!warning]\n> Let op.\n\n> [geen kader]\n> tekst\n\n> [!note] Titel met *nadruk*\n> body\n\n> [!onzin] x",
		'hedgedoc-line-numbers' => "```javascript=101\nvar a = 1;\nvar b = 2;\n```\n\n```=\neen\n```\n\n```sh=+\ndrie\nvier\n```\n\n```text\nvijf\n```\n",
		'hedgedoc' => ":::info\nUitleg met **vet**.\n:::\n\n:::danger\nGevaar\n:::\n\n> :::info\n> binnen\n> :::\n> na",
		'paginalinks' => "Zie [[Raadsnieuws]], [[Raadsnieuws|de reeks]] en [[Open bestuur#kop-geschiedenis]]. `[[code]]` en [[ ]].",
		'markeren' => "==rijp== ++nieuw++ 10^3^ H~2~O, a == b, 5 ~ 6, x ^ y, ~niet sub~",
		'notities' => "Tekst %% geheim %% verder.\n\n%% een notitie\nover twee regels %%\n\nNa.\n\n%% open\n\nnog hier",
		'figuren' => "![Bram Hoekstra](beeld/a.jpg){.klein-rechts}\n*Bijschrift met **vet**. Foto X*\n\n![Raadszaal](beeld/b.jpg)\n\nTekst ![icoon](i.png) tekst.\n\n![x](foto.jpg =200x150)",
		'diagram' => "%% beschrijving: tijdlijn van Eemstad %%\n```mermaid {.klein-rechts}\ntimeline\n    2005 : Open Eemstad\n```\n\n```mermaid\npie\n```",
		'formules' => "Zo: \$a^2\$ klaar, van \$10 tot \$20, `\$x\$`.\n\n\$\$\n\\int_0^1 x\\,dx\n\$\$\n\n\$\$ a+b \$\$",
		'code' => "```php\n<?php echo 1;\n```\n\n```javascript\nlet a = 1;\n```\n\n```sql\nSELECT 1;\n```\n\n```python\ndef a(): pass\n```\n\n```html\n<p>x</p>\n```\n\n```css\na { color: red; }\n```\n\n```json\n{\"a\": 1}\n```\n\n```yaml\na: 1\n```\n\n```bash\necho \$A\n```\n\n```xml\n<a/>\n```\n\n```cobol\nDISPLAY 'X'.\n```\n\n```\nzonder taal\n```",
		'voetnoten' => "Tekst.[^1] En meer.[^bron]\n\n[^1]: Eerste.\n[^bron]: Tweede met *nadruk*.",
		'koppen' => "### De eerste zetels\n\n### De eerste zetels\n\n#### Café „De Zwaan”\n\n[TOC]",
		'html' => "<details><summary>Meer</summary>\n\nUitklap.\n\n</details>\n\n<kbd>⌘</kbd> <abbr title=\"Wet open overheid\">Woo</abbr>\n\n<macro name=\"pagelist\" tags=\"x\"/>",
		'definities' => "Woo\n: Wet open overheid",
		'ingesloten' => "https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nhttps://vimeo.com/76979871\n\nhttps://evil.example/watch?v=x\n\nKijk op https://www.youtube.com/watch?v=dQw4w9WgXcQ hier.\n\n{%youtube abcdefgh %}",
	];
