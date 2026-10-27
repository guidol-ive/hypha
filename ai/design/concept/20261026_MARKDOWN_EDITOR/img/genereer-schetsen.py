#!/usr/bin/env python3
#
# Generates the mock-ups of the Markdown editor design in the house style of De Stadsbron.
#
import base64, sys, os, re, math
from xml.sax.saxutils import escape

#
# Usage: python3 -I genereer-schetsen.py <folder holding logo-destadsbron.png and fonts/>
#
OUT = sys.argv[1]
#
# Language: 'nl' (default) writes to OUT, 'en' writes to OUT/en using the translation table vertaling-en.json.
# With COLLECT=1 every text is written to teksten.json, to keep the translation table complete.
#
LANG = sys.argv[2] if len(sys.argv) > 2 else 'nl'
SVG_OUT = os.path.join(OUT, 'en') if LANG == 'en' else OUT
os.makedirs(SVG_OUT, exist_ok=True)
import json
TR = json.load(open(os.path.join(OUT, 'vertaling-en.json'))) if LANG == 'en' else {}
SEEN, MISSING = [], set()
def tr(t):
	if os.environ.get('COLLECT') and t not in SEEN: SEEN.append(t)
	if LANG != 'en' or not t.strip(): return t
	if t in TR: return TR[t]
	MISSING.add(t); return t
ROOT = os.path.abspath(OUT)
while not os.path.exists(os.path.join(ROOT, 'data/themes/default/fonts/forkawesome-webfont.svg')):
    if ROOT == os.path.dirname(ROOT):
        sys.exit('Hypha-root met data/themes/default niet gevonden boven ' + OUT)
    ROOT = os.path.dirname(ROOT)
LOGO = base64.b64encode(open(os.path.join(OUT, 'logo-destadsbron.png'), 'rb').read()).decode()

#
# House style fonts of De Stadsbron (Lato and Lora, SIL Open Font License), embedded so the
# mock-ups show the right font when used as <img>.
#
FONTS = [('Lato', 400, 'normal', 'lato-regular'), ('Lato', 700, 'normal', 'lato-bold'),
         ('Lora', 400, 'normal', 'lora-regular'), ('Lora', 700, 'normal', 'lora-bold'), ('Lora', 400, 'italic', 'lora-italic')]
FONT_CSS = ''.join(
    f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:{st};src:url(data:font/woff2;base64,"
    f"{base64.b64encode(open(os.path.join(OUT, 'fonts', f + '.woff2'), 'rb').read()).decode()}) format('woff2')}}"
    for fam, w, st, f in FONTS)

#
# Icons: Fork Awesome, shipped with the default Hypha theme and used by De Stadsbron.
#
_FA = open(os.path.join(ROOT, 'data/themes/default/fonts/forkawesome-webfont.svg')).read()
GLYPHS = {}
for _m in re.finditer(r'<glyph\b([^>]*)>', _FA):
    _a = dict(re.findall(r'([\w-]+)="([^"]*)"', _m.group(1)))
    if 'glyph-name' in _a and 'd' in _a:
        GLYPHS[_a['glyph-name']] = (_a['d'], float(_a.get('horiz-adv-x', 1536)))

INK, GREY, DARK, LIGHT = '#1d2021', '#505458', '#666666', '#dddddd'
BG, CARD, LINE = '#F5F5F3', '#ffffff', '#D5D8DA'
TEAL, TEAL_L, TEAL_D = '#0B7285', '#E3F3F5', '#226765'  # #0B7285: merk-blauwgroen #0c8599 donkerder, voor contrast ≥ 4,5:1 (WCAG 2.1 AA)
BRAND_TEAL = '#0c8599'
ORANGE, ORANGE_L = '#fe9900', '#FFF1DB'
RED, RED_L = '#be0709', '#FBE9E9'
OK = '#237A35'
DIM = '#6E7781'
MARK = '#7B2CBF'
YELLOW = '#FFFFD6'
#
# Series colours of diagrams: a calm sub-palette around the house colours blue-green and orange,
# all at about the same lightness, validated for colour blindness (adjacent pairs ΔE ≥ 8) and ≥ 4.5:1 for white text.
#
SERIES = ['#007A8F', '#9C6410', '#3A5FA8', '#3B7F34', '#9E4C76', '#7D641E']
SERIES_L = ['#E1F2F5', '#F8EEDF', '#E6ECF6', '#E8F3E6', '#F5E8EF', '#F3EEE1']
SANS = "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif"
SERIF = "Lora, Georgia, 'Times New Roman', serif"
MONO = "Menlo, Consolas, monospace"


class Svg:
    def __init__(self, w, h, title, bg=BG):
        self.w, self.h, self.parts = w, h, []
        self.parts.append(f'<rect width="{w}" height="{h}" fill="{bg}"/>')
        self.title = title
        self.icons = set()
        self.embed_fonts = True

    def add(self, s):
        self.parts.append(s)

    def rect(self, x, y, w, h, fill='none', stroke=None, rx=0, sw=1, dash=None, opacity=None, extra=''):
        a = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"'
        if rx: a += f' rx="{rx}"'
        if stroke: a += f' stroke="{stroke}" stroke-width="{sw}"'
        if dash: a += f' stroke-dasharray="{dash}"'
        if opacity is not None: a += f' opacity="{opacity}"'
        self.add(a + f'{extra}/>')

    def text(self, x, y, s, size=14, fill=INK, weight=None, family=SANS, anchor=None, italic=False, raw=False, extra=''):
        s = tr(s)
        a = f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-family="{family}"'
        if weight: a += f' font-weight="{weight}"'
        if anchor: a += f' text-anchor="{anchor}"'
        if italic: a += ' font-style="italic"'
        if family == MONO: a += ' xml:space="preserve"'
        self.add(a + f'{extra}>{s if raw else escape(s)}</text>')

    def line(self, x1, y1, x2, y2, stroke=LINE, sw=1, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def circle(self, cx, cy, r, fill, stroke=None, sw=1):
        s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{s}/>')

    def icon(self, name, x, y, size=16, fill=INK):
        #
        # Fork Awesome icon with its lower left corner on the baseline (x, y).
        #
        self.icons.add(name)
        k = size / 1792
        self.add(f'<use href="#fa-{name}" fill="{fill}" transform="translate({x} {y + size * 0.14:.1f}) scale({k:.5f} {-k:.5f})"/>')

    def icon_width(self, name, size=16):
        return GLYPHS[name][1] * size / 1792

    def check(self, x, y, kind, label, size=13, raw=False):
        ic, col = {'ok': ('check', OK), 'fout': ('times', RED), 'tip': ('exclamation-triangle', ORANGE)}[kind]
        self.icon(ic, x, y, size - 1, col)
        self.text(x + 20, y, label, size, INK, raw=raw)

    def logo(self, x, y, w):
        h = round(w * 67 / 250)
        self.add(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{LOGO}"/>')

    def header(self, user='Sanne (uitloggen)'):
        self.rect(0, 0, self.w, 76, CARD)
        self.line(0, 76, self.w, 76, LIGHT)
        self.logo(24, 8, 224)
        x = self.w - 24
        items = ['ZOEK', 'GEHEUGEN', 'DOSSIERS', 'OPINIE', 'RUBRIEKEN', 'ONDERZOEK']
        for it in items:
            w = len(it) * 8.2 + 18
            x -= w
            self.rect(x, 36, w, 28, ORANGE)
            self.text(x + w / 2, 55, it, 12.5, INK, anchor='middle', extra=' letter-spacing="0.4"')
            x -= 6
        if user:
            self.text(self.w - 24, 24, user, 12, GREY, anchor='end')

    def button(self, x, y, w, h, label, kind='primary', size=13):
        if kind == 'primary':
            self.rect(x, y, w, h, TEAL, rx=3)
            self.text(x + w / 2, y + h / 2 + size * 0.36, label.upper(), size, '#fff', 700, anchor='middle', extra=' letter-spacing="0.5"')
        elif kind == 'grey':
            self.rect(x, y, w, h, '#5F656A', rx=3)
            self.text(x + w / 2, y + h / 2 + size * 0.36, label.upper(), size, '#fff', 700, anchor='middle', extra=' letter-spacing="0.5"')
        else:
            self.rect(x, y, w, h, CARD, '#9AA1A6', rx=3)
            self.text(x + w / 2, y + h / 2 + size * 0.36, label, size, INK, anchor='middle')

    def card(self, x, y, w, h, fill=CARD, stroke=LINE):
        self.rect(x, y, w, h, fill, stroke, rx=4)

    def photo(self, x, y, w, h, label=None):
        self.rect(x, y, w, h, '#CFD8DA')
        cx, cy, r = x + w * 0.5, y + h * 0.42, min(w, h) * 0.16
        self.add(f'<path d="M{x} {y+h} L{x} {y+h*0.78} L{x+w*0.3} {y+h*0.62} L{x+w*0.55} {y+h*0.74} L{x+w*0.8} {y+h*0.58} L{x+w} {y+h*0.7} L{x+w} {y+h} Z" fill="#B7C4C7"/>')
        self.circle(cx, cy, r, '#9FAEB2')
        self.add(f'<path d="M{cx-r*1.9} {y+h} Q{cx-r*1.8} {cy+r*1.3} {cx} {cy+r*1.2} Q{cx+r*1.8} {cy+r*1.3} {cx+r*1.9} {y+h} Z" fill="#9FAEB2"/>')
        if label:
            self.text(x + 8, y + h - 8, label, 11, '#fff', 700)

    def mark(self, n, x, y):
        self.circle(x, y, 13, MARK)
        self.text(x, y + 5, str(n), 13, '#fff', 700, anchor='middle')

    def toolbar(self, x, y, w, active=None, modes=False, edit='markdown', strip_x=None, strip_w=None, view='write'):
        #
        # Toolbar of the new editor: a band in the brand colours, the formatting buttons and, on the right,
        # download, open and help. Below it, inside the frame of the text, the switch between visual editing
        # and Markdown ('Bewerken als'), like 'Bekijk als' in the preview. Returns the height of both.
        #
        self.rect(x, y, w, 44, CARD, LINE)
        self.rect(x, y, w / 2, 4, ORANGE); self.rect(x + w / 2, y, w / 2, 4, BRAND_TEAL)
        items = [('header', 'Tussenkop', 10), ('bold', None, 104), ('italic', None, 126), ('list-ul', 'Lijst', 152),
                 ('quote-left', 'Citaat', 208), ('square-o', 'Kader', 284), ('table', 'Tabel', 350), ('link', 'Link', 434),
                 ('picture-o', 'Beeld…', 488), ('sitemap', 'Diagram…', 564), ('ellipsis-h', None, 654)]
        compact = w < 1000
        if edit == 'visual':
            items = [it for it in items if it[0] != 'ellipsis-h']
        for ic, label, dx in items:
            col = TEAL if active and label == active else INK
            self.icon(ic, x + dx, y + 30, 15, col)
            if label:
                self.text(x + dx + self.icon_width(ic, 15) + 5, y + 30, label, 14, col, 700 if col == TEAL else None)
            if ic == 'table':
                self.icon('caret-down', x + dx + 57, y + 30, 11, col)
        for dx in (96, 144, 426, 670):
            self.line(x + dx, y + 12, x + dx, y + 36)
        if compact:
            #
            # Narrow: '.md' and 'open' go into 'Meer'; the cheat sheet (?) stays in Markdown; the view switch
            # shows icons only, at the right end.
            #
            if edit == 'markdown': self.icon('question-circle', x + 678, y + 30, 15, INK)
            self.text(x + 700, y + 30, 'Meer', 14, INK); self.icon('caret-down', x + 734, y + 30, 11, INK)
            self.modes_compact(x + w - 104, y + 7, view)
        else:
            rx = x + 678
            self.icon('download', rx, y + 30, 15, INK); self.text(rx + 18, y + 30, '.md', 13, INK)
            self.icon('file-text-o', rx + 50, y + 30, 14, INK)
            if edit == 'markdown': self.icon('question-circle', rx + 72, y + 30, 15, INK)
            if modes:
                self.modes(x + w - 252, y + 7, False)
        sx = x if strip_x is None else strip_x
        self.editbar(sx, y + 44, (x + w - sx) if strip_w is None else strip_w, edit)
        return 80

    def modes_compact(self, mx, y, view='write'):
        #
        # View switch with icons only: write, preview, side by side.
        #
        self.rect(mx, y, 98, 30, '#EEF0F1', rx=4)
        for k, (ic, key) in enumerate([('pencil', 'write'), ('eye', 'preview'), ('columns', 'side')]):
            bx = mx + 3 + k * 31
            if key == view: self.rect(bx, y + 3, 30, 24, CARD, LINE, rx=3)
            self.icon(ic, bx + 15 - self.icon_width(ic, 13) / 2, y + 20, 13, INK if key == view else GREY)

    def fixed_box(self, x, y, w, h, rounded=3):
        #
        # A fixed field that is visibly editable: white with a dashed line.
        #
        self.rect(x, y, w, h, CARD, '#8A9096', rx=rounded, extra=' stroke-dasharray="4 3"')

    def editbar(self, x, y, w, edit):
        #
        # 'Bewerken als: Opmaak | Markdown' at the top of the frame of the text.
        #
        self.rect(x, y, w, 36, CARD); self.line(x, y + 36, x + w, y + 36, LINE)
        self.text(x + 16, y + 23, 'Bewerken als:', 12, GREY)
        bx0 = x + 104
        self.rect(bx0, y + 4, 150, 28, '#EEF0F1', rx=4)
        for k, (ic, label, key) in enumerate([('font', 'Opmaak', 'visual'), ('hashtag', 'Markdown', 'markdown')]):
            bx = bx0 + 3 + k * 66
            on = key == edit
            if on: self.rect(bx, y + 7, 64 if k == 0 else 78, 22, TEAL, rx=3)
            self.icon(ic, bx + 5, y + 23, 11, '#fff' if on else GREY)
            self.text(bx + 19, y + 23, label, 11.5, '#fff' if on else GREY, 700 if on else None)

    def place_icon(self, x, y, kind):
        #
        # Pictogram of where an image or diagram ends up in the article, as in the prototype.
        #
        self.rect(x, y, 44, 32, CARD, '#9AA1A6', rx=2)
        ln = lambda ys, lx=4, lw=36: [self.rect(x + lx, y + yy, lw, 2, '#C4C9CC') for yy in ys]
        if kind == 'breed': ln([4]); self.rect(x + 4, y + 8, 36, 14, INK); ln([25])
        elif kind == 'in-de-tekst': ln([4]); self.rect(x + 4, y + 8, 26, 14, INK); ln([25])
        elif kind == 'klein-rechts': ln([4, 8, 12, 16], 4, 19); self.rect(x + 27, y + 4, 13, 13, INK); ln([21, 25])
        else: self.rect(x + 4, y + 3, 30, 3, DIM); self.rect(x + 4, y + 9, 36, 12, INK); ln([24, 27])

    def place_options(self, x, y, w, keys, selected):
        names = {'breed': 'Breed', 'in-de-tekst': 'In de tekst', 'klein-rechts': 'Klein rechts', 'bovenaan': 'Bovenaan'}
        gap = 8; bw = (w - gap * (len(keys) - 1)) / len(keys)
        for k, key in enumerate(keys):
            bx = x + k * (bw + gap)
            on = key == selected
            self.rect(bx, y, bw, 62, TEAL_L if on else CARD, TEAL if on else LINE, rx=4, sw=2 if on else 1)
            self.place_icon(bx + bw / 2 - 22, y + 7, key)
            self.text(bx + bw / 2, y + 54, names[key], 12, INK, anchor='middle')

    def modes(self, mx, y, narrow=True):
        #
        # View switch: write, preview or side by side; on narrow screens only the active one has a word.
        #
        bw = 150 if narrow else 244
        self.rect(mx, y, bw, 30, '#EEF0F1', rx=4)
        self.rect(mx + 3, y + 3, 82, 24, CARD, LINE, rx=3)
        segs = [('pencil', 'Schrijven', 10, INK, 700), ('eye', 'Voorbeeld', 92, GREY, None), ('columns', 'Naast', 180, GREY, None)]
        if narrow:
            segs = [('columns', 'Naast', 10, INK, 700), ('pencil', '', 100, GREY, None), ('eye', '', 128, GREY, None)]
        for (ic, label, ox, col, wt) in segs:
            self.icon(ic, mx + ox, y + 20, 11 if label else 13, col)
            if label: self.text(mx + ox + 16, y + 20, label, 12, col, wt)


    def facts(self, x, y, lines, saved=None):
        #
        # Save status and statistics as bullets at the top of the checklist.
        #
        for k, t in enumerate(lines):
            self.circle(x + 3, y + k * 19 - 4, 2.2, GREY)
            self.text(x + 12, y + k * 19, t, 12.5, GREY)

    def switch(self, x, y, label, on=False):
        self.rect(x, y - 13, 34, 20, TEAL if on else '#8A9096', rx=10)
        self.circle(x + (24 if on else 10), y - 3, 8, '#fff')
        self.text(x + 42, y + 1, label, 13, INK)

    def switch_right(self, xr, y, label, on=False):
        #
        # Switch aligned to the right, with its label on the left.
        #
        self.text(xr - 42, y + 1, label, 12, GREY, anchor='end')
        self.rect(xr - 34, y - 13, 34, 20, TEAL if on else '#8A9096', rx=10)
        self.circle(xr - (10 if on else 24), y - 3, 8, '#fff')

    def checklist_head(self, x, y, w):
        self.text(x + 20, y + 28, 'beoordelingschecklist', 15, INK, 700)
        self.switch_right(x + w - 18, y + 26, 'toon alles')

    def image_card(self, x, y, w):
        self.card(x, y, w, 76)
        self.text(x + 20, y + 26, 'afbeelding bij uittreksel', 14, INK, 700)
        self.text(x + w - 20, y + 26, 'ook de grote foto boven het artikel', 12, DARK, anchor='end')
        self.photo(x + 20, y + 34, 64, 34)
        self.text(x + 96, y + 50, 'hoekstra-raadszaal.jpg · Bram Hoekstra na twintig jaar in de raad van Eemstad.', 12, DARK)
        self.icon('upload', x + 96, y + 66, 12, TEAL); self.text(x + 114, y + 66, 'vervangen · bijschrift en fotograaf', 12.5, TEAL)

    def gobtn(self, x, y, label):
        w = len(label) * 6.6 + 30
        self.rect(x, y, w, 24, CARD, TEAL, rx=12)
        self.text(x + 10, y + 16, label, 12, TEAL, 700)
        self.icon('arrow-right', x + w - 18, y + 16, 10, TEAL)

    def cheat(self, x, y, w, h):
        #
        # Cheat sheet in a column left of the text; only visible while editing Markdown.
        #
        self.rect(x, y, w, h, YELLOW); self.line(x + w, y, x + w, y + h, '#E6E3A1')
        self.text(x + 12, y + 26, 'spiekbriefje', 14, INK, 700)
        rows = [('### Tussenkop', 'tussenkop'), ('**vet**', 'vet'), ('*schuin*', 'schuin'), ('- punt', '• opsomming'),
                ('&gt; [!quote]', 'citaat'), ('&gt; [!info] Titel', 'kader'), ('[[Raadsnieuws]]', 'link naar pagina'),
                ('==markeren==', 'markering'), ('tekst[^1]', 'voetnoot'), ('/', 'alle blokken')]
        yy = y + 50
        for a, b in rows:
            if yy > y + h - 30: break
            self.text(x + 12, yy, a, 11.5, INK, family=MONO, raw=True)
            self.text(x + 12, yy + 15, b, 11.5, GREY)
            yy += 34

    def svg(self):
        body = '\n  '.join(self.parts)
        defs = ''.join(f'<path id="fa-{n}" d="{GLYPHS[n][0]}"/>' for n in sorted(self.icons))
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" font-family="{SANS}">\n'
                f'  <title>{escape(tr(self.title))}</title>\n  <defs><style>{FONT_CSS if self.embed_fonts else ""}</style>{defs}</defs>\n  {body}\n</svg>\n')

    def save(self, name):
        open(os.path.join(SVG_OUT, name), 'w').write(self.svg())


def tabs(s, y, legend=True):
    s.rect(24, y, 120, 38, CARD, LINE, rx=4); s.rect(25, y + 24, 118, 16, CARD)
    s.rect(24, y, 120, 3, ORANGE)
    s.text(84, y + 24, 'artikel ✓', 14, INK, 700, anchor='middle')
    s.rect(150, y + 4, 140, 32, '#E9EBEC', rx=4); s.text(220, y + 25, 'bijsluiter <tspan fill="#be0709">●</tspan>', 14, GREY, anchor='middle', raw=True)
    s.rect(296, y + 4, 120, 32, '#E9EBEC', rx=4); s.text(356, y + 25, 'bronnen <tspan fill="#B36B00">○</tspan>', 14, GREY, anchor='middle', raw=True)
    if legend: s.text(430, y + 25, '<tspan fill="#be0709">●</tspan> verplicht  <tspan fill="#B36B00">○</tspan> aanbevolen', 12, DARK, raw=True)


def checklist(s):
    s.card(880, 144, 296, 316)
    s.checklist_head(880, 144, 296)
    s.facts(902, 202, ['286 woorden', '± 2 min lezen', 'taal: Nederlands ▾'])
    s.check(900, 274, 'fout', 'een bijsluiter is verplicht')
    s.gobtn(920, 284, 'bijsluiter invullen')
    s.check(900, 332, 'tip', 'bronnen worden aangeraden')
    s.gobtn(920, 342, 'bronnen invullen')
    s.text(900, 392, 'Artikel is niet compleet, beoordeling kan', 12.5, RED, 700)
    s.text(900, 409, 'nog niet gestart worden.', 12.5, RED, 700)


TITLE = 'Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur'
TITLE_1 = 'Vertrekkend raadslid Bram Hoekstra: twintig'
TITLE_2 = 'jaar strijd voor open bestuur'


def page_title(s, y=118, size=26):
    s.text(24, y, TITLE, size, INK, 700, SERIF)


#
# 01 Starting.
#
s = Svg(1200, 780, "Stap 1 – Nieuwe pagina van het type 'artikel met review' en de gewone manier van schrijven kiezen", bg='#fff')
s.header()
s.rect(0, 77, 1200, 703, INK, opacity=0.35)
s.card(200, 100, 800, 656)
s.text(232, 146, 'nieuwe pagina', 26, INK, 700, SERIF)
s.text(968, 146, '✕', 22, DARK, anchor='end')
s.text(232, 186, 'paginatype ⓘ', 14, INK, 700)
s.rect(232, 196, 250, 34, CARD, '#9AA1A6', rx=3); s.text(244, 218, 'artikel met review', 14); s.text(470, 218, '▾', 14, anchor='end')
s.text(510, 186, 'taal', 14, INK, 700)
s.rect(510, 196, 120, 34, CARD, '#9AA1A6', rx=3); s.text(522, 218, 'nl', 14); s.text(618, 218, '▾', 14, anchor='end')
s.rect(660, 206, 16, 16, TEAL, rx=2); s.icon('check', 662, 218, 11, '#fff')
s.text(684, 219, 'privé ⓘ <tspan fill="#666666" font-size="12">(tot publicatie)</tspan>', 14, raw=True)
s.text(232, 264, 'paginanaam ⓘ', 14, INK, 700)
s.rect(232, 274, 736, 36, CARD, '#9AA1A6', rx=3); s.text(244, 298, 'Afscheid_Hoekstra', 15)
s.text(232, 330, 'Wordt het webadres: destadsbron.nl/nl/Afscheid_Hoekstra. De kop van het artikel vul je zo in.', 12, DARK)
s.text(232, 366, 'hoe wil je meestal schrijven? <tspan fill="#666666" font-weight="400">(je kunt altijd wisselen met de schakelaar in de werkbalk)</tspan>', 14, INK, 700, raw=True)
#
# Option: visual editing.
#
s.rect(232, 378, 356, 204, TEAL_L, TEAL, rx=6, sw=2.5)
s.circle(258, 406, 9, CARD, TEAL, 2); s.circle(258, 406, 5, TEAL)
s.icon('font', 278, 412, 15, INK); s.text(300, 412, 'Opmaak', 17, INK, 700)
for i, t in enumerate(['Zoals in Word: je ziet direct vette', "woorden, koppen, foto's en kaders.", 'Fijn als je Markdown niet kent.']):
    s.text(258, 440 + i * 20, t, 14, GREY)
s.rect(258, 502, 304, 60, CARD, rx=4)
s.text(272, 526, 'De eerste zetels', 15, INK, 700)
s.text(272, 548, 'Open Eemstad haalde <tspan font-weight="700">meteen twee zetels</tspan>.', 13, INK, family=SERIF, raw=True)
#
# Option: Markdown.
#
s.rect(612, 378, 356, 204, CARD, LINE, rx=6, sw=1.5)
s.circle(638, 406, 9, CARD, '#9AA1A6', 2)
s.icon('hashtag', 658, 412, 14, INK); s.text(678, 412, 'Markdown', 17, INK, 700)
for i, t in enumerate(['Met eenvoudige tekens, zoals ### en', '**. Rustig schrijven, ook voor lange', 'artikelen; met spiekbriefje.']):
    s.text(638, 440 + i * 20, t, 14, GREY)
s.rect(638, 502, 304, 60, '#F7F8F8', rx=4)
s.text(652, 526, '<tspan fill="#6E7781">### </tspan>De eerste zetels', 14, INK, family=MONO, raw=True)
s.text(652, 548, 'Open Eemstad haalde <tspan fill="#6E7781">**</tspan><tspan font-weight="700">meteen</tspan><tspan fill="#6E7781">**</tspan>…', 14, INK, family=MONO, raw=True)
s.rect(232, 602, 736, 56, '#F7F8F8', LINE, rx=6, dash='6 4')
s.icon('file-text-o', 256, 636, 16, TEAL)
s.text(280, 636, 'Heb je al een tekst? <tspan fill="#0B7285" text-decoration="underline">Open een Markdown-bestand (.md)</tspan> of sleep het hierheen.', 15, raw=True)
s.rect(232, 680, 18, 18, TEAL, rx=2); s.icon('check', 235, 693, 12, '#fff')
s.text(260, 694, 'onthoud mijn keuze', 14, GREY)
s.button(740, 708, 104, 34, 'annuleren', 'grey')
s.button(856, 708, 112, 34, 'maak pagina')
s.mark(1, 232, 196); s.mark(2, 220, 364); s.mark(3, 980, 630); s.mark(4, 214, 689)
s.save('01-starten.svg')

#
# 02 Writing.
#
s = Svg(1200, 880, 'Stap 2 – Schrijven in Markdown: titel, auteur, uittreksel, tags, afbeelding, bijsluiter en bronnen als vaste front matter bovenaan de tekst')
s.header()
page_title(s, 120, 24)
s.button(972, 98, 96, 32, 'afbreken', 'grey'); s.button(1080, 98, 96, 32, 'opslaan')
top = 144 + s.toolbar(24, 144, 836)
s.rect(24, top, 836, 850 - top, CARD, LINE)
#
# Front matter: fixed lines at the top of the Markdown, the image, bijsluiter and bronnen included.
#
fm = [('---', None), ('titel:', '"Vertrekkend raadslid Bram Hoekstra: twintig jaar'), (None, 'strijd voor open bestuur"'), ('auteur:', 'Sanne de Vries'),
      ('uittreksel:', '"Twintig jaar lang vroeg Bram Hoekstra in de raad van'), (None, 'Eemstad om openbare stukken en debatten. Nu neemt de'),
      (None, 'fractievoorzitter van Open Eemstad afscheid."'), ('tags:', ''), (None, '  - Politiek en bestuur'), (None, '  - Raadsnieuws'),
      ('afbeelding:', 'beeld/hoekstra.jpg'), ('beschrijving:', 'Bram Hoekstra in de raadszaal van Eemstad'),
      ('bijschrift:', '"Bram Hoekstra na twintig jaar in de raad van Eemstad."'), ('fotograaf:', 'Foto (naam fotograaf)'),
      ('bijsluiter:', '|'), (None, '  Sanne de Vries is politiek verslaggever en schrijft elke week over de raad.'),
      ('bronnen:', '|'), (None, '  - Raadsinformatie gemeente Eemstad'), (None, '  - Interview met Bram Hoekstra'), ('---', None)]
y = top + 34
for k, v in fm:
    if k == 'afbeelding:': y_img = y
    if k == 'bijsluiter:': y_bs = y
    if v is None: s.text(60, y, k, 16, DIM, family=SERIF)
    elif k is None: s.text(60, y, v, 16, GREY, family=SERIF)
    else: s.text(60, y, f'<tspan fill="#6E7781">{k}</tspan> {v}', 16, GREY, family=SERIF, raw=True)
    y += 23
s.text(60, y + 18, 'Bram Hoekstra (1962) was bibliothecaris in de wijk Eemstad-Noord', 17, family=SERIF)
s.text(60, y + 44, 'toen buurtbewoners hem vroegen iets te doen met hun klachten.', 17, family=SERIF)
s.text(60, y + 90, '<tspan fill="#6E7781" font-weight="400">### </tspan>De eerste zetels', 21, INK, 700, raw=True)
s.text(60, y + 124, 'In 2006 haalde de partij <tspan fill="#6E7781" font-family="Menlo, Consolas, monospace" font-size="15">**</tspan><tspan font-weight="700">meteen twee zetels</tspan><tspan fill="#6E7781" font-family="Menlo, Consolas, monospace" font-size="15">**</tspan>|', 17, family=SERIF, raw=True)
#
# Side column: checklist with the switch next to its title, statistics, problems only; the structure folded.
#
checklist(s)
s.card(880, 472, 296, 44)
s.icon('caret-right', 900, 500, 12, GREY); s.text(916, 500, 'structuur', 15, INK, 700)
s.mark(1, 756, 150); s.mark(2, 124, 192); s.mark(3, 370, 152); s.mark(4, 54, top + 28)
s.mark(5, 54, y_img - 6); s.mark(6, 54, y_bs - 6); s.mark(7, 54, y + 84); s.mark(8, 1176, 160); s.mark(9, 686, 152)
s.save('02-schrijven.svg')

#
# 02b Writing in visual mode.
#
s = Svg(1200, 980, 'Stap 2b – Schrijven in Opmaak: artikelkop, bijsluiter en bronnen als vaste, bewerkbare en dichtvouwbare blokken')
s.header()
page_title(s, 120, 24)
s.button(972, 98, 96, 32, 'afbreken', 'grey'); s.button(1080, 98, 96, 32, 'opslaan')
top = 144 + s.toolbar(24, 144, 836, edit='visual')
s.rect(24, top, 836, 950 - top, CARD, LINE)
s.add('<g transform="translate(0 -38)">')
#
# Fixed article head: every field a visibly editable box; image and excerpt on one row, tags below.
#
s.rect(60, 280, 764, 340, '#F7FAFB', LINE, rx=4); s.rect(60, 280, 4, 340, TEAL)
s.icon('caret-down', 76, 300, 11, GREY); s.icon('pencil-square-o', 90, 300, 11, GREY)
s.text(106, 300, 'ARTIKELKOP · VASTE VELDEN', 11, GREY, 700, extra=' letter-spacing="0.5"'); s.text(286, 300, '– de vakken zijn bewerkbaar', 11, GREY)
s.fixed_box(74, 310, 736, 30); s.text(82, 332, TITLE, 18, INK, 700, SERIF)
s.text(78, 362, 'door', 12, GREY); s.fixed_box(108, 349, 250, 20); s.text(116, 363, 'Sanne de Vries', 13, INK)
s.rect(78, 380, 204, 96, CARD, LINE, rx=3); s.photo(81, 383, 198, 74)
s.icon('upload', 146, 470, 10, TEAL); s.text(160, 470, 'andere foto', 11, TEAL)
s.text(78, 492, 'beeld/hoekstra.jpg', 12, DARK); s.text(282, 492, 'weghalen', 12, TEAL, anchor='end', extra=' text-decoration="underline"')
for k, (key, val) in enumerate([('beschrijving', 'Bram Hoekstra in de raadszaal'), ('bijschrift', 'Bram Hoekstra na twintig jaar…'), ('fotograaf', 'Foto (naam fotograaf)')]):
    yy = 502 + k * 26
    s.text(78, yy + 14, key, 11, GREY)
    s.fixed_box(146, yy, 136, 20); s.text(152, yy + 14, val[:20] + ('…' if len(val) > 20 else ''), 12, INK)
s.text(300, 392, 'uittreksel (ankeiler)', 11, GREY)
s.fixed_box(300, 398, 510, 96)
for k, t in enumerate(['Twintig jaar lang vroeg Bram Hoekstra in de raad van', 'Eemstad om openbare stukken en debatten. Nu neemt de',
                       'fractievoorzitter van Open Eemstad afscheid, met een paar', 'adviezen voor zijn opvolgers.']):
    s.text(310, 418 + k * 21, t, 15, INK, 700, SERIF)
s.text(300, 510, '31 woorden', 11, OK)
s.text(78, 608, 'tags', 12, GREY)
s.rect(110, 594, 128, 20, ORANGE_L, ORANGE, rx=10); s.text(174, 608, 'Politiek en bestuur ✕', 11.5, INK, anchor='middle')
s.rect(244, 594, 112, 20, ORANGE_L, ORANGE, rx=10); s.text(300, 608, 'Raadsnieuws ✕', 11.5, INK, anchor='middle')
s.fixed_box(364, 594, 96, 20, 10); s.text(376, 608, '+ tag', 12, GREY); s.icon('caret-down', 444, 608, 10, GREY)
#
# Formatted text with an image that can be deleted.
#
s.text(60, 654, 'Bram Hoekstra (1962) was bibliothecaris in de wijk Eemstad-Noord toen buurtbewoners', 17, family=SERIF)
s.text(60, 680, 'hem vroegen iets te doen met hun klachten over het stadhuis.', 17, family=SERIF)
s.text(60, 718, 'De eerste zetels', 20, INK, 700)
s.text(60, 750, 'In 2006 haalde de partij <tspan font-weight="700">meteen twee zetels</tspan>.|', 17, family=SERIF, raw=True)
s.photo(60, 766, 330, 112)
s.circle(368, 788, 16, 'rgba(29,32,33,.75)'); s.text(368, 794, '✕', 15, '#fff', anchor='middle')
s.text(60, 898, 'Bram Hoekstra tijdens zijn laatste raadsvergadering. Foto (naam fotograaf)', 13, GREY)
#
# Bijsluiter and bronnen at the end, folded: the summary shows what is in them.
#
for k, (name, hint, summ) in enumerate([('BIJSLUITER · VAST VELD', '(verplicht)', '– Sanne de Vries is politiek verslaggever en schrijft elke week over de raad.'),
                                        ('BRONNEN · VAST VELD', '(aanbevolen)', '– 2 bronnen')]):
    yy = 918 + k * 40
    s.rect(60, yy, 764, 32, '#F7FAFB', LINE, rx=4); s.rect(60, yy, 4, 32, TEAL)
    s.icon('caret-right', 76, yy + 21, 11, GREY); s.icon('pencil-square-o', 90, yy + 21, 11, GREY)
    s.text(106, yy + 21, name, 11, GREY, 700, extra=' letter-spacing="0.5"')
    s.text(106 + len(name) * 7.4, yy + 21, hint, 11, GREY)
    s.text(106 + len(name) * 7.4 + len(hint) * 6 + 10, yy + 21, summ, 13, INK, family=SERIF)
s.add('</g>')
checklist(s)
s.card(880, 472, 296, 44)
s.icon('caret-right', 900, 500, 12, GREY); s.text(916, 500, 'structuur', 15, INK, 700)
s.mark(1, 124, 192); s.mark(2, 60, 242); s.mark(3, 364, 556); s.mark(4, 60, 342); s.mark(5, 396, 750); s.mark(6, 44, 856); s.mark(7, 44, 896); s.mark(8, 300, 354)
s.save('02b-opmaak.svg')

#
# 03 Structuring.
#
s = Svg(1200, 836, 'Stap 3 – Structuur aanbrengen met het /-menu: tussenkoppen, citaat, kader en voetnoot')
s.header()
s.text(24, 104, TITLE, 18, INK, 700, SERIF)
s.button(1080, 84, 96, 32, 'opslaan')
s.toolbar(24, 128, 836)
s.add('<g transform="translate(0 36)">')
s.rect(24, 172, 836, 604, CARD, LINE)
s.add('<g>')
s.text(64, 212, 'Zijn eerste motie, om alle raadsstukken een week voor de vergadering', 17, family=SERIF)
s.text(64, 238, 'te publiceren, werd in 2007 aangenomen.<tspan fill="#0c8599" font-size="12" baseline-shift="super">1</tspan>', 17, family=SERIF, raw=True)
s.rect(64, 262, 150, 4, ORANGE)
s.text(64, 296, 'Belangrijke besluiten vielen in die jaren', 21, INK, family=SERIF, italic=True)
s.text(64, 324, 'zelden in de openbare raadsvergadering', 21, INK, family=SERIF, italic=True)
s.text(690, 304, '&gt; [!quote] citaat', 12, DIM, family=MONO, anchor='end', raw=True)
s.rect(64, 346, 630, 98, TEAL_L, rx=3); s.rect(64, 346, 4, 98, TEAL)
s.icon('info-circle', 84, 372, 15, TEAL_D); s.text(106, 372, 'Open Eemstad in het kort', 15, TEAL_D, 700)
s.text(684, 372, '&gt; [!info]', 12, '#0B7285', family=MONO, anchor='end', raw=True)
s.text(84, 398, 'Lokale partij, opgericht in de aanloop naar de gemeenteraadsverkiezingen', 15)
s.text(84, 420, '2006. Speerpunten: openbaarheid en wijkbudgetten.', 15)
s.text(64, 486, '/|', 17, family=SERIF)
s.rect(84, 500, 380, 256, CARD, '#9AA1A6', rx=6, extra=' filter="drop-shadow(0 4px 10px rgba(0,0,0,.15))"')
s.text(104, 524, 'BLOK INVOEGEN — typ om te zoeken', 12, DARK, 700)
s.rect(92, 534, 364, 34, TEAL_L, rx=4)
menu = [('header', 'Tussenkop', '### '), ('header', 'Subkop', '#### '), ('quote-left', 'Citaat (opvallende uitspraak)', '&gt; [!quote]'),
        ('square-o', 'Kader met uitleg', '&gt; [!info]'), ('superscript', 'Voetnoot', '[^1]'), ('table', 'Tabel', '| … |'), ('sitemap', 'Diagram', '```mermaid')]
for i, (ic, a, b) in enumerate(menu):
    y = 556 + i * 30
    s.icon(ic, 106, y, 14, TEAL_D)
    s.text(132, y, a, 15, INK)
    s.text(444, y, b, 12, DARK, family=MONO, anchor='end', raw=True)
s.add('</g>')
s.add('</g>')
s.card(880, 128, 296, 300)
s.text(900, 156, 'structuur', 15, INK, 700)
outline = [('titel · uittreksel · afbeelding ✓', INK, 900), ('› De eerste zetels', INK, 900), ('› Wethouder voor één jaar', INK, 900),
           ('❝ citaat', DARK, 916), ('▢ Open Eemstad in het kort', DARK, 916), ('› (nieuw blok)', TEAL, 900)]
for i, (t, c, x) in enumerate(outline):
    s.text(x, 188 + i * 26, t, 14, c)
s.text(900, 360, 'voetnoten (onder het artikel)', 13, DARK)
s.text(916, 384, '1. Raadsinformatie Eemstad, 2015', 13, DARK)
s.card(880, 440, 296, 200, YELLOW, '#E6E3A1')
s.text(900, 468, 'tip', 15, INK, 700)
for i, t in enumerate(['Typ <tspan font-family="Menlo, monospace">/</tspan> aan het begin van een regel', 'voor alle blokken. Pijltjes + Enter', 'of tikken werkt allebei.', '', 'Een tussenkop om de 4 à 6 alinea’s', 'houdt een lang stuk leesbaar.']):
    s.text(900, 496 + i * 20, t, 13, GREY, raw=True)
s.mark(1, 84, 536); s.mark(2, 64, 298); s.mark(3, 64, 382); s.mark(4, 610, 266); s.mark(5, 880, 128)
s.save('03-structureren.svg')

#
# 03b Tables.
#
s = Svg(1200, 780, 'Stap 3b – Een tabel invoegen zoals in Word, en per kolom links, gecentreerd of rechts uitlijnen')
s.header()
s.text(24, 104, TITLE, 18, INK, 700, SERIF)
s.button(1080, 84, 96, 32, 'opslaan')
top = 128 + s.toolbar(24, 128, 836, active='Tabel', edit='visual')
s.rect(24, top, 836, 756 - top, CARD, LINE)
s.text(60, top + 40, 'De zetelverdeling na de verkiezingen van 2026 laat zien hoe groot', 17, family=SERIF)
s.text(60, top + 66, 'de winst voor Open Eemstad was.', 17, family=SERIF)
cols = [('Partij', 170, 'start'), ('Zetels 2022', 100, 'end'), ('Zetels 2026', 100, 'end'), ('Verschil', 90, 'end')]
rows = [('Open Eemstad', '4', '6', '+2'), ('Partij A', '9', '8', '−1'), ('Partij B', '7', '7', '0'), ('Overig', '17', '16', '−1|')]
ty = top + 92
tx = 60
for ci, (h, w, a) in enumerate(cols):
    s.rect(tx, ty, w, 32, '#F7FAFB', LIGHT)
    s.text(tx + (8 if a == 'start' else w - 8), ty + 21, h, 14, INK, 700, anchor=a)
    for ri, r in enumerate(rows):
        s.rect(tx, ty + 32 + ri * 32, w, 32, CARD, LIGHT)
        s.text(tx + (8 if a == 'start' else w - 8), ty + 53 + ri * 32, r[ci], 14, INK, anchor=a)
    tx += w
s.text(60, ty + 32 * 5 + 30, 'Bedragen en aantallen staan rechts uitgelijnd, zodat de cijfers onder elkaar staan.', 13, GREY)
#
# The menu of the 'Tabel' button, with the cursor in the last column.
#
mx, my, mw = 534, 170, 250
s.rect(mx, my, mw, 384, CARD, '#9AA1A6', rx=6, extra=' filter="drop-shadow(0 6px 12px rgba(0,0,0,.18))"')
s.text(mx + 12, my + 22, 'NIEUWE TABEL · AANTAL KOLOMMEN', 11, DARK, 700)
for k, n in enumerate([2, 3, 4, 5, 6]):
    bx = mx + 12 + k * 46
    for r in range(3):
        for c in range(n):
            s.rect(bx + c * 6, my + 34 + r * 5, 6, 5, TEAL_L if r == 0 else CARD, DIM, sw=0.6)
    s.text(bx + n * 3, my + 66, str(n), 12, INK, anchor='middle')
s.line(mx + 6, my + 78, mx + mw - 6, my + 78, LINE)
s.text(mx + 12, my + 98, 'DEZE TABEL', 11, DARK, 700)
items = [('align-left', 'Kolom links uitlijnen'), ('align-center', 'Kolom centreren'), ('align-right', 'Kolom rechts uitlijnen'), None,
         ('plus', 'Rij toevoegen'), ('plus', 'Kolom toevoegen'), ('minus', 'Rij verwijderen'), ('minus', 'Kolom verwijderen'), ('trash-o', 'Tabel verwijderen')]
iy = my + 108
for it in items:
    if it is None:
        s.line(mx + 6, iy + 4, mx + mw - 6, iy + 4, LINE); iy += 10; continue
    ic, t = it
    if t == 'Kolom rechts uitlijnen': s.rect(mx + 6, iy, mw - 12, 28, TEAL_L, rx=4)
    s.icon(ic, mx + 16, iy + 19, 13, INK); s.text(mx + 38, iy + 19, t, 14, INK)
    iy += 29
s.card(880, 128, 296, 452)
s.text(900, 156, 'tabellen', 15, INK, 700)
tips = [('Tabel ▾', True), ('kies het aantal kolommen;', False), ('de tabel komt onder de alinea.', False), ('', False),
        ('Rechtermuisknop in een cel', True), ('opent hetzelfde menu, ook', False), ('met uitlijnen per kolom.', False), ('', False),
        ('Tab en Shift+Tab', True), ('naar de volgende of vorige cel;', False), ('in de laatste cel komt er een', False), ('rij bij.', False), ('', False),
        ('In Markdown', True)]
for i, (t, b) in enumerate(tips):
    s.text(900, 186 + i * 21, t, 13, INK if b else GREY, 700 if b else None)
for i, t in enumerate(['| Partij | 2022 | 2026 |', '| --- | ---: | ---: |', '| Open Eemstad | 4 | 6 |']):
    s.text(900, 486 + i * 20, t, 12, INK, family=MONO)
s.text(900, 552, ':---: centreert, ---: lijnt rechts uit', 12, GREY)
s.mark(1, 370, 140); s.mark(2, mx, my + 40); s.mark(3, mx, my + 160); s.mark(4, mx, my + 260); s.mark(5, 60, ty); s.mark(6, 880, 128)
s.save('03b-tabel.svg')

#
# 04 Images.
#
s = Svg(1200, 740, 'Stap 4 – Foto invoegen met beschrijving, bijschrift en fotograaf', bg='#fff')
s.header()
s.rect(0, 77, 1200, 663, INK, opacity=0.35)
s.card(150, 96, 900, 620)
s.text(182, 140, 'Beeld invoegen', 24, INK, 700, SERIF)
s.text(1018, 140, '✕', 22, DARK, anchor='end')
s.photo(182, 164, 380, 250)
s.text(182, 440, 'hoekstra-raadszaal.jpg · 3,2 MB · verkleind tot 2000 px', 13, DARK)
s.icon('upload', 182, 464, 14, TEAL); s.text(204, 464, 'Andere foto kiezen', 14, TEAL)
s.icon('camera', 182, 488, 13, DARK); s.text(204, 488, 'Op iPhone/iPad: Fotobibliotheek, Camera of Bestanden', 13, DARK)
s.text(596, 180, 'Wat staat erop? <tspan fill="#be0709">*</tspan>', 14, INK, 700, raw=True)
s.rect(596, 190, 422, 36, CARD, '#9AA1A6', rx=3); s.text(608, 213, 'Bram Hoekstra in de raadszaal van Eemstad', 14)
s.text(596, 244, 'Voor mensen die de foto niet kunnen zien (voorleessoftware).', 12, DARK)
s.text(596, 282, 'Bijschrift', 14, INK, 700)
s.rect(596, 292, 422, 56, CARD, TEAL, rx=3, sw=2)
s.text(608, 315, 'Bram Hoekstra tijdens zijn laatste', 14)
s.text(608, 336, 'raadsvergaderingen.|', 14)
s.text(596, 376, 'Foto / bron', 14, INK, 700)
s.rect(596, 386, 422, 36, CARD, '#9AA1A6', rx=3); s.text(608, 409, 'Foto (naam fotograaf)', 14)
s.text(596, 450, 'Plaatsing', 14, INK, 700)
s.place_options(596, 460, 422, ['breed', 'in-de-tekst', 'klein-rechts', 'bovenaan'], 'breed')
s.rect(182, 556, 836, 74, '#F7F8F8', LINE, rx=4)
s.text(198, 578, 'DIT KOMT IN JE TEKST TE STAAN', 12, DARK, 700)
s.text(198, 600, '![Bram Hoekstra in de raadszaal van Eemstad](beeld/hoekstra-raadszaal.jpg){.breed}', 13, family=MONO)
s.text(198, 618, '*Bram Hoekstra tijdens zijn laatste raadsvergadering. Foto (naam fotograaf)*', 13, family=MONO)
s.button(796, 650, 104, 36, 'annuleren', 'grey'); s.button(912, 650, 106, 36, 'invoegen')
s.mark(1, 182, 164); s.mark(2, 596, 164); s.mark(3, 596, 446); s.mark(4, 182, 556)
s.save('04-beeld.svg')

#
# 05 Linking.
#
s = Svg(1200, 656, "Stap 5 – Verwijzen naar andere pagina's met [[ ]] en naar externe bronnen")
s.header()
s.toolbar(24, 92, 836, active='Link')
s.add('<g transform="translate(0 36)">')
s.rect(24, 136, 836, 460, CARD, LINE)
s.add('<g>')
lines = ['Ook als fractievoorzitter bleef Hoekstra hameren op', 'openheid. Hij vroeg vaak naar vertrouwelijke stukken (zie',
         'ons stuk over <tspan fill="#0B7285" text-decoration="underline">geheimhouding in de raad</tspan>). De gemeente',
         'publiceert ze in het <tspan fill="#0B7285" text-decoration="underline">raadsinformatiesysteem</tspan> ↗.',
         'Meer in de reeks <tspan fill="#6E7781" font-family="Menlo, monospace" font-size="15">[[</tspan>Raads|']
for i, t in enumerate(lines):
    s.text(64, 178 + i * 26, t, 17, family=SERIF, raw=True)
s.add('</g>')
s.add('<g transform="translate(-152 0)">')
s.rect(560, 270, 400, 226, CARD, '#9AA1A6', rx=6, extra=' filter="drop-shadow(0 4px 10px rgba(0,0,0,.15))"')
s.text(576, 294, "PAGINA'S OP DEZE SITE", 12, DARK, 700)
s.rect(568, 304, 384, 40, TEAL_L, rx=4)
s.text(582, 322, '<tspan fill="#0c8599">Raads</tspan>nieuws – alle afleveringen', 15, INK, 700, raw=True)
s.text(582, 338, 'nl/Raadsnieuws · rubriek', 12, DARK)
s.text(582, 370, '<tspan fill="#0c8599">Politiek</tspan> en bestuur – overzicht', 15, raw=True)
s.text(582, 402, 'Dossier <tspan fill="#0c8599">politiek</tspan>e cultuur *', 15, raw=True)
s.text(582, 434, '+ Nieuwe pagina „Politieke” aanmaken', 15, DARK)
s.line(568, 450, 952, 450, '#E4E7EB')
s.text(576, 478, '* = besloten pagina, alleen zichtbaar voor leden', 12, DARK)
s.add('</g>')
s.add('</g>')
s.card(880, 92, 296, 540)
s.text(900, 120, 'twee soorten links', 15, INK, 700)
info = [('Binnen deze site', True), ('Typ <tspan font-family="Menlo, monospace">[[</tspan> en kies een pagina.', False), ('Krijgt die pagina later een andere', False),
        ('naam, dan blijft de link werken.', False), ('<tspan font-family="Menlo, monospace" fill="#1d2021">[[Raadsnieuws|de reeks]]</tspan>', False),
        ('tekst na | is wat de lezer ziet', False), ('', False), ('Naar een andere website', True), ('Plak het webadres op geselecteerde', False),
        ('tekst; de link wordt vanzelf gemaakt.', False), ('<tspan font-family="Menlo, monospace" fill="#1d2021">[raadsinformatie](https://…)</tspan>', False), ('', False),
        ('Controle', True), ('Links naar een pagina die (nog)', False), ('niet bestaat worden <tspan fill="#be0709">rood</tspan> onderstreept.', False), ('Externe links krijgen een ↗.', False)]
for i, (t, b) in enumerate(info):
    s.text(900, 152 + i * 22, t, 13, INK if b else GREY, 700 if b else None, raw=True)
s.mark(1, 408, 306); s.mark(2, 408, 258); s.mark(3, 880, 92)
s.save('05-koppelen.svg')

#
# 06 Diagram.
#
s = Svg(1200, 660, 'Stap 6 – Een tijdlijn maken met een Mermaid-diagram, met voorbeeld en foutmelding in gewone taal')
s.header()
s.card(24, 92, 1152, 64)
s.icon('sitemap', 44, 130, 15, INK); s.text(70, 130, 'Diagram – begin met een voorbeeld:', 15, INK, 700)
chips = [('Tijdlijn', 90, True), ('Staafdiagram', 120, False), ('Taartdiagram', 120, False), ('Lijndiagram', 110, False), ('Stroomschema', 130, False)]
x = 350
for t, w, on in chips:
    s.rect(x, 108, w, 32, TEAL if on else CARD, None if on else '#9AA1A6', rx=16)
    s.text(x + w / 2, 129, t, 14, '#fff' if on else INK, anchor='middle')
    x += w + 10
s.rect(x, 108, 130, 32, CARD, '#9AA1A6', rx=16); s.text(x + 58, 129, 'meer soorten', 14, INK, anchor='middle'); s.icon('caret-down', x + 108, 129, 12, INK)
x_more = x
s.card(24, 168, 500, 468)
s.text(44, 196, 'TEKST VAN HET DIAGRAM', 13, DARK, 700)
code = [('```mermaid', DIM), ('timeline', INK), ('  title Bram Hoekstra in de raad', INK), ('  2005 : Open Eemstad opgericht', INK),
        ('  2006 : Twee zetels in de raad', INK), ('  2014   Een jaar wethouder', INK), ('  2026 : Afscheid van de raad', INK), ('```', DIM)]
s.rect(40, 342, 476, 24, RED_L)
for i, (t, c) in enumerate(code):
    s.text(44, 230 + i * 26, t, 14, c, family=MONO)
s.rect(44, 444, 460, 96, ORANGE_L, ORANGE, rx=4)
s.icon('exclamation-triangle', 60, 470, 14, ORANGE); s.text(84, 470, 'Regel 6 klopt nog niet', 14, '#8A4B00', 700)
s.text(60, 494, 'Zet een dubbele punt ( : ) tussen het jaartal en', 13, GREY)
s.text(60, 514, 'de gebeurtenis. <tspan fill="#0c8599" text-decoration="underline">Herstel voor mij</tspan>', 13, GREY, raw=True)
s.text(44, 562, 'Plaatsing', 13, INK, 700)
s.place_options(44, 570, 460, ['breed', 'in-de-tekst', 'klein-rechts'], 'breed')
s.card(540, 168, 636, 468)
s.text(560, 196, 'ZO ZIET DE LEZER HET  (laatste goede versie)', 13, DARK, 700)
s.text(858, 248, 'Bram Hoekstra in de raad', 18, INK, 700, SERIF, anchor='middle')
s.line(570, 340, 1150, 340, GREY, 3)
for i, (yr, a, b, col, fill) in enumerate([('2005', 'Open Eemstad', 'opgericht', SERIES[0], SERIES_L[0]), ('2006', 'Twee zetels', 'in de raad', SERIES[1], SERIES_L[1]), ('2026', 'Afscheid van', 'de raad', SERIES[2], SERIES_L[2])]):
    x = 590 + i * 190
    s.rect(x, 280, 150, 40, fill, col, rx=4); s.text(x + 75, 306, yr, 14, INK, 700, anchor='middle')
    s.line(x + 75, 320, x + 75, 390, col, 1, '4 3')
    s.rect(x, 390, 150, 56, CARD, col, rx=4)
    s.text(x + 75, 414, a, 14, anchor='middle'); s.text(x + 75, 434, b, 14, anchor='middle')
s.text(560, 510, 'Getekend met Pele in 0,2 ms. Het diagram is gewone tekst', 13, DARK)
s.text(560, 530, 'in Mermaid-notatie tussen ```mermaid en ```.', 13, DARK)
s.button(560, 558, 250, 36, 'Beschrijving voor voorlezen…', 'outline', 14)
s.mark(1, 350, 108); s.mark(2, 24, 168); s.mark(3, 44, 444); s.mark(4, 540, 168); s.mark(5, x_more, 108); s.mark(6, 24, 562)
s.save('06-diagram.svg')

#
# 06b More diagram types: the list with the example of the type under the mouse.
#
s = Svg(1200, 640, 'Stap 6b – Meer soorten diagrammen: een lijst van 20 soorten, met het voorbeeld van de soort onder de muis')
s.header()
s.card(24, 92, 1152, 524)
s.icon('sitemap', 44, 130, 15, INK); s.text(70, 130, 'Diagram – begin met een voorbeeld:', 15, INK, 700)
x = 350
for t, w, on in chips:
    s.rect(x, 108, w, 32, TEAL if on else CARD, None if on else '#9AA1A6', rx=16)
    s.text(x + w / 2, 129, t, 14, '#fff' if on else INK, anchor='middle')
    x += w + 10
s.rect(x, 108, 130, 32, CARD, TEAL, rx=16, sw=2); s.text(x + 58, 129, 'meer soorten', 14, INK, anchor='middle'); s.icon('caret-down', x + 108, 129, 12, INK)
s.rect(44, 160, 470, 420, '#F7F8F8', LINE, rx=4)
s.text(64, 190, 'TEKST VAN HET DIAGRAM', 13, DARK, 700)
px, py = 420, 150
s.rect(px, py, 740, 450, CARD, '#9AA1A6', rx=8, extra=' filter="drop-shadow(0 8px 16px rgba(0,0,0,.2))"')
s.line(px + 404, py, px + 404, py + 450, LINE)
s.rect(px + 12, py + 12, 380, 380, '#FAFBFB', rx=4)
#
# Example: money flows (sankey), drawn in the style Pele uses.
#
fl = [(70, 'Rijk 70', SERIES[2]), (30, 'Belasting 30', SERIES[3])]
right = [(40, 'Zorg 40', SERIES[0]), (25, 'Onderwijs 25', SERIES[1]), (20, 'Wonen 20', SERIES[4]), (15, 'Overig 15', SERIES[5])]
k = 2.6; lx, mx2, rx2 = px + 70, px + 190, px + 300; yy = py + 70
for v, t, c in fl:
    s.rect(lx, yy, 10, v * k, c)
    s.add(f'<path d="M{lx+10} {yy} C{lx+90} {yy} {mx2-80} {yy} {mx2} {yy} L{mx2} {yy+v*k} C{mx2-80} {yy+v*k} {lx+90} {yy+v*k} {lx+10} {yy+v*k} Z" fill="{c}" opacity=".35"/>')
    s.text(lx - 4, yy + v * k / 2 + 4, t, 10, INK, anchor='end')
    yy += v * k
s.rect(mx2, py + 70, 10, 100 * k, BRAND_TEAL); s.text(mx2 + 14, py + 70 + 50 * k, 'Gemeente 100', 10, INK)
yy, ry = py + 70, py + 60
for v, t, c in right:
    s.add(f'<path d="M{mx2+10} {yy} C{mx2+90} {yy} {rx2-80} {ry} {rx2} {ry} L{rx2} {ry+v*k} C{rx2-80} {ry+v*k} {mx2+90} {yy+v*k} {mx2+10} {yy+v*k} Z" fill="{c}" opacity=".35"/>')
    s.rect(rx2, ry, 10, v * k, c); s.text(rx2 + 14, ry + v * k / 2 + 4, t, 10, INK)
    yy += v * k; ry += v * k + 6
s.text(px + 34, py + 418, '<tspan font-weight="700">Geldstromen</tspan> – Waar het geld heen gaat (sankey)', 13, GREY, raw=True)
types = [('Organogram', 'Wie valt onder wie'), ('Beslisboom', 'Vragen met ja of nee naar een uitkomst'), ('Planning', 'Fasen van een project in de tijd'),
         ('Staaf en lijn', 'Twee reeksen in één grafiek'), ('Begroting in vlakken', 'Hoe groot elk deel is (treemap)'), ('Geldstromen', 'Waar het geld heen gaat (sankey)'),
         ('Kwadrant', 'Plannen langs twee assen indelen'), ('Wie doet wat', 'Berichten tussen partijen op volgorde'), ('Taakverdeling', 'Stappen per afdeling of rol (swimlane)'),
         ('Statussen', 'De fasen die een aanvraag doorloopt')]
for i, (t, d) in enumerate(types):
    iy = py + 10 + i * 39
    if t == 'Geldstromen': s.rect(px + 412, iy, 316, 37, TEAL_L, rx=4)
    s.text(px + 424, iy + 17, t, 14, INK, 700)
    s.text(px + 424, iy + 32, d, 11.5, DARK)
s.text(px + 424, py + 425, '… en nog 10: vergelijking, overlap, mindmap, …', 11.5, DIM)
s.mark(1, x, 108); s.mark(2, px + 412, py + 10 + 5 * 39); s.mark(3, px + 12, py + 12); s.mark(4, px + 12, py + 412)
s.save('06b-diagramsoorten.svg')

#
# 07 Checking.
#
s = Svg(1200, 800, 'Stap 7 – Controleren in de voorbeeldweergave (computer en telefoon) met beoordelingschecklist')
s.header()
s.card(24, 88, 1152, 44)
s.rect(34, 95, 250, 30, '#EEF0F1', rx=4)
s.text(70, 115, 'Schrijven', 12, GREY, anchor='middle')
s.rect(106, 98, 80, 24, CARD, LINE, rx=3); s.text(146, 115, 'Voorbeeld', 12, INK, 700, anchor='middle')
s.text(236, 115, 'Naast elkaar', 12, GREY, anchor='middle')
s.text(310, 115, 'Bekijk als:', 13, GREY); s.icon('desktop', 384, 115, 14, INK); s.text(406, 115, 'Computer', 13, INK, 700)
s.icon('mobile', 480, 115, 15, GREY); s.text(494, 115, 'Telefoon staand', 13, GREY)
s.icon('mobile', 610, 115, 15, GREY); s.text(626, 115, 'Telefoon liggend', 13, GREY)

s.card(24, 144, 620, 632)
s.text(64, 180, 'POLITIEK EN BESTUUR  ||  RAADSNIEUWS', 11, TEAL, 700, extra=' letter-spacing="1"')
s.text(64, 216, TITLE_1, 26, INK, 700, SERIF)
s.text(64, 248, TITLE_2, 26, INK, 700, SERIF)
s.text(64, 282, 'Na twintig jaar neemt Bram Hoekstra afscheid van de raad van Eemstad.', 15, INK, 700, SERIF)
s.text(64, 304, 'Een terugblik op twintig jaar vragen om openheid…', 15, INK, 700, SERIF)
s.text(64, 330, 'door Sanne de Vries · voorbeeld (nog niet gepubliceerd)', 12, DARK)
s.photo(64, 346, 540, 180)
s.text(64, 544, 'Bram Hoekstra tijdens zijn laatste raadsvergadering. <tspan font-style="italic">Foto (naam fotograaf)</tspan>', 12, DARK, raw=True)
for i, t in enumerate(['Bram Hoekstra (1962) was bibliothecaris in de wijk Eemstad-', 'Noord toen buurtbewoners hem vroegen iets te doen met hun', 'klachten over het stadhuis. Stukken kwamen pas na de', 'vergadering online…']):
    s.text(64, 582 + i * 22, t, 15, family=SERIF)
s.text(64, 696, 'De eerste zetels', 18, INK, 700)
#
# Phone.
#
s.rect(664, 144, 200, 420, CARD, None, rx=28); s.rect(664, 144, 200, 420, INK, rx=28)
s.rect(674, 166, 180, 376, CARD, rx=6)
s.logo(714, 172, 100)
for i, it in enumerate(['ONDERZOEK', 'RUBRIEKEN', 'OPINIE']):
    s.rect(680 + i * 58, 204, 54, 12, ORANGE); s.text(707 + i * 58, 213, it, 6.5, INK, anchor='middle')
s.text(684, 234, 'RAADSNIEUWS', 7, TEAL, 700)
s.text(684, 252, 'Vertrekkend raadslid Bram', 14, INK, 700, SERIF)
s.text(684, 269, 'Hoekstra: twintig jaar strijd', 14, INK, 700, SERIF)
s.text(684, 286, 'voor open bestuur', 14, INK, 700, SERIF)
s.photo(674, 298, 180, 96)
for i, t in enumerate(['Bram Hoekstra was biblio-', 'thecaris in Eemstad-Noord', 'toen buurtbewoners hem…']):
    s.text(684, 412 + i * 12, t, 9, family=SERIF)
s.rect(684, 452, 160, 40, TEAL_L); s.rect(684, 452, 3, 40, TEAL)
s.icon('info-circle', 692, 468, 9, TEAL_D); s.text(705, 468, 'Open Eemstad in het kort', 9, TEAL_D, 700)
s.card(884, 144, 292, 632)
s.text(904, 172, 'beoordelingschecklist', 15, INK, 700)
s.switch_right(1158, 170, 'toon alles')
s.facts(906, 202, ['1.284 woorden', '± 6 min lezen', 'taal: Nederlands ▾'])
s.text(904, 322, 'alles in orde ✓', 13, OK)
s.text(904, 346, 'Artikel is compleet, beoordeling kan', 13, OK, 700)
s.text(904, 364, 'gestart worden.', 13, OK, 700)
s.line(904, 382, 1156, 382, '#E4E7EB')
s.text(904, 406, 'extra tips <tspan font-weight="400" fill="#666666">(niet verplicht)</tspan>', 13, INK, 700, raw=True)
s.check(904, 436, 'tip', '1 foto zonder beschrijving')
s.gobtn(924, 446, 'foto aanvullen')
s.check(904, 496, 'tip', '3 zinnen langer dan 30 woorden')
s.text(904, 540, 'Groene punten verschijnen met de', 12, DARK)
s.text(904, 556, 'schakelaar; standaard alleen wat', 12, DARK)
s.text(904, 572, 'nog aandacht vraagt.', 12, DARK)
s.button(904, 704, 252, 44, 'start beoordeling ›', 'primary', 14)
s.mark(1, 34, 95); s.mark(2, 664, 144); s.mark(3, 884, 144); s.mark(4, 1080, 150)
s.save('07-controleren.svg')

#
# 08 Review.
#
s = Svg(1200, 880, "Stap 8 – Beoordeling door collega's: opmerkingen, redactiestatuut bij goedkeuren, en terugtrekken door de auteur")
s.header()
s.card(24, 92, 1152, 72)
steps = [(140, 'schets', 'done'), (440, 'in beoordeling', 'now'), (740, 'goedgekeurd (1 van 3)', 'todo'), (1040, 'gepubliceerd', 'todo')]
for i, (x, t, st) in enumerate(steps):
    if i < 3:
        s.line(x + 20, 120, steps[i + 1][0] - 20, 120, OK if st == 'done' else LIGHT, 3)
    if st == 'done':
        s.circle(x, 120, 12, OK); s.icon('check', x - 7, 125, 13, '#fff')
    elif st == 'now':
        s.circle(x, 120, 12, TEAL); s.text(x, 125, '2', 14, '#fff', anchor='middle')
    elif t.startswith('goedgekeurd'):
        #
        # One of three approvals: the dot is filled for one third.
        #
        s.circle(x, 120, 12, CARD, OK, 2)
        s.add(f'<path d="M{x} 120 L{x} 108 A12 12 0 0 1 {x + 12 * math.sin(2 * math.pi / 3):.2f} {120 - 12 * math.cos(2 * math.pi / 3):.2f} Z" fill="{OK}"/>')
    else:
        s.circle(x, 120, 12, CARD, '#6E7781', 2)
    s.text(x, 152, t, 14, INK if st != 'todo' else DARK, 700 if st == 'now' else None, anchor='middle')
s.card(24, 176, 760, 440)
s.text(56, 216, 'Een nieuwe partij', 21, INK, 700)
s.rect(56, 288, 300, 22, '#FFE8A3')
for i, t in enumerate(['Bij de verkiezingen van 2018 groeide de partij', 'naar vier zetels. Hoekstra haalde twee nieuwe', 'raadsleden binnen, nu voor de nieuwe wijken.', 'Hij begeleidde hen in hun eerste jaar…']):
    s.text(56, 252 + i * 24, t, 16, family=SERIF)
s.rect(56, 376, 696, 184, '#F7F8F8', rx=4)
s.text(72, 402, 'Bewerken tijdens beoordeling kan nog steeds – in dezelfde tekst-editor.', 13, DARK)
s.text(72, 424, 'Hypha bewaart bij een artikel alleen de laatste stand; versies vallen buiten de scope (#241).', 13, DARK)
s.text(72, 466, 'raadsleden binnen, voor Noord en Eemhaven-Oost.', 15, INK, family=SERIF)
s.text(72, 500, 'Aangepast na de opmerking van de eindredactie.', 12, DARK)
s.card(800, 176, 376, 440)
s.text(820, 204, 'beoordelingsopmerkingen', 15, INK, 700)
s.rect(816, 218, 344, 134, YELLOW, '#E6E3A1', rx=4)
s.text(832, 242, 'Marieke (eindredactie) · <tspan fill="#be0709">breekpunt</tspan>', 13, INK, 700, raw=True)
s.text(832, 266, '„nieuwe wijken” – welke wijken precies?', 13, GREY)
s.text(832, 286, 'Graag de namen noemen.', 13, GREY)
s.text(832, 318, '↳ Sanne: wijknamen toegevoegd', 13, OK); s.icon('check', 1040, 318, 12, OK)
s.text(832, 340, 'breekpunt opheffen', 12, TEAL, extra=' text-decoration="underline"')
s.rect(816, 364, 344, 80, '#F7F8F8', rx=4)
s.text(832, 388, 'Pieter · gaf goedkeuring', 13, INK, 700); s.icon('check', 1000, 388, 12, OK)
s.text(832, 412, 'Sterk portret; de tijdlijn helpt.', 13, GREY)
s.text(832, 432, 'redactiestatuut: 7 van 7 punten bevestigd', 12, OK)
s.rect(816, 460, 344, 60, CARD, '#9AA1A6', rx=3)
s.text(832, 486, 'voeg beoordelingsopmerking toe…', 13, DIM)
s.rect(816, 548, 128, 34, CARD, RED, rx=3); s.text(880, 570, 'trek terug', 13, RED, 700, anchor='middle')
s.button(956, 548, 204, 34, 'geef goedkeuring…')
s.text(816, 600, 'trek terug: alleen de auteur', 11, DARK)
#
# The approval window: confirm the editorial statute, with an optional comment.
#
s.card(24, 632, 1152, 224, '#fff', '#9AA1A6')
s.text(48, 664, 'Goedkeuring geven', 20, INK, 700, SERIF)
s.text(48, 690, 'Redactiestatuut – bevestig elk punt', 13, INK, 700)
statute = ['Feiten zijn gecontroleerd', 'Hoor en wederhoor', 'Feit en mening zijn gescheiden', 'Belangen zijn gemeld',
           'Privacy is gerespecteerd', 'Citaten kloppen', 'Beeld mag gebruikt worden']
for i, t in enumerate(statute):
    cx, cy = 48 + (i // 4) * 270, 712 + (i % 4) * 30
    s.rect(cx, cy, 16, 16, TEAL if i < 6 else CARD, TEAL if i < 6 else '#6E7781', rx=3)
    if i < 6: s.icon('check', cx + 2, cy + 13, 12, '#fff')
    s.text(cx + 26, cy + 13, t, 13.5, INK)
s.text(620, 690, 'Opmerking bij je goedkeuring', 13, INK, 700); s.text(812, 690, '(niet verplicht)', 12, DARK)
s.rect(620, 700, 532, 72, CARD, '#9AA1A6', rx=3)
s.text(632, 724, 'Sterk portret; de tijdlijn helpt.', 14)
s.text(620, 790, 'Komt bij de beoordelingsopmerkingen.', 12, DARK)
s.text(620, 836, 'Bevestig nog 1 punt van het redactiestatuut.', 12, DARK)
s.button(912, 812, 110, 34, 'annuleren', 'grey')
s.rect(1034, 812, 118, 34, '#9FC4CB', rx=3); s.text(1093, 834, 'GEEF GOEDKEURING', 11, '#fff', 700, anchor='middle')
s.mark(1, 24, 92); s.mark(2, 800, 176); s.mark(3, 56, 376); s.mark(4, 816, 548); s.mark(5, 48, 690); s.mark(6, 620, 690)
s.save('08-beoordelen.svg')

#
# 09 Published.
#
s = Svg(1200, 1120, 'Stap 9 – Het gepubliceerde artikel in de stijl van De Stadsbron', bg='#fff')
s.rect(0, 0, 1200, 190, '#fff')
s.logo(450, 18, 300)
x = 600 - 470 / 2
for it in ['ONDERZOEK', 'RUBRIEKEN', 'OPINIE', 'DOSSIERS', 'GEHEUGEN', 'ZOEK']:
    w = len(it) * 9 + 20
    s.rect(x, 120, w, 32, ORANGE); s.text(x + w / 2, 141, it, 14, INK, anchor='middle')
    x += w + 10
s.text(960, 180, 'Politiek en bestuur <tspan fill="#1d2021">||</tspan> Raadsnieuws', 13, TEAL, 700, anchor='end', raw=True)
gx = 240
s.text(gx, 214, '2 reacties', 13, DARK)
s.text(gx, 262, TITLE_1, 34, INK, 700, SERIF)
s.text(gx, 302, TITLE_2, 34, INK, 700, SERIF)
s.text(gx, 344, 'Na twintig jaar neemt Bram Hoekstra afscheid van de raad van Eemstad. Een terugblik', 18, INK, 700, SERIF)
s.text(gx, 370, 'op twintig jaar vragen om openbare stukken, met adviezen voor de opvolgers.', 18, INK, 700, SERIF)
s.text(gx, 404, 'door Sanne de Vries - 12 oktober 2026 · leestijd 9 minuten', 14, GREY)
s.icon('envelope', 900, 406, 20, INK); s.icon('twitter', 928, 406, 20, INK); s.icon('facebook', 956, 406, 20, INK)
s.photo(140, 424, 920, 300)
s.text(gx, 748, 'Bram Hoekstra tijdens zijn laatste raadsvergadering.  <tspan font-style="italic" fill="#666666">Foto (naam fotograaf)</tspan>', 13, GREY, raw=True)
body = ['Bram Hoekstra (1962) was bibliothecaris in de wijk Eemstad-Noord toen', 'buurtbewoners hem in 2005 vroegen iets te doen met hun klachten over het',
        'stadhuis. Stukken kwamen pas na de vergadering online, en wie wilde inspreken', 'moest dat een week van tevoren per brief melden.']
for i, t in enumerate(body):
    s.text(gx, 792 + i * 28, t, 17, family=SERIF)
s.text(gx, 932, 'De eerste zetels', 20, INK, 700)
s.text(gx, 966, 'Open Eemstad haalde in 2006 meteen twee zetels in de raad…', 17, family=SERIF)
s.rect(40, 780, 160, 4, ORANGE)
for i, t in enumerate(['Belangrijke', 'besluiten vielen', 'zelden in de', 'openbare raads-', 'vergadering']):
    s.text(40, 812 + i * 24, t, 18, INK, family=SERIF, italic=True)
s.rect(990, 780, 190, 170, TEAL_L); s.rect(990, 780, 4, 170, TEAL)
s.text(1004, 806, 'Open Eemstad', 14, TEAL_D, 700)
for i, t in enumerate(['Lokale partij uit', 'Eemstad-Noord,', 'opgericht in 2005.', 'Twee zetels in 2006,', 'vier in 2018.', '']):
    s.text(1004, 830 + i * 19, t, 12.5)
s.line(140, 994, 1060, 994, LIGHT)
s.text(gx, 1022, 'BIJSLUITER', 13, INK, 700, extra=' letter-spacing="0.5"')
s.text(gx, 1044, 'Sanne de Vries is politiek verslaggever en schrijft elke week over de gemeenteraad (verzonnen voorbeeld).', 13, GREY)
s.rect(gx, 1062, 720, 50, '#DDDDDD')
s.text(gx + 16, 1092, 'Steun de Stadsbron!', 15, INK, 700, SERIF)
s.button(gx + 590, 1072, 116, 30, 'Draag bij!')
s.save('09-gepubliceerd.svg')

#
# 00 House style.
#
s = Svg(1200, 1340, 'Huisstijl De Stadsbron in de editor: kleuren, lettertypes, iconen en componenten', bg='#fff')
s.logo(24, 20, 224)
s.text(1176, 52, 'Huisstijl in de editor', 26, INK, 700, SERIF, anchor='end')
s.text(1176, 76, 'bron: thema ‘destadsbron’ op test.destadsbron.nl', 13, DARK, anchor='end')
s.line(24, 100, 1176, 100, LIGHT)
s.text(24, 136, 'Kleurenpalet', 20, INK, 700)
pal = [(INK, 'Tekst', '--black', 'tekst en koppen'), (ORANGE, 'Oranje', '--orange', 'menu, tags, actief'), (BRAND_TEAL, 'Blauwgroen', '--bluegreen', 'merk, vlakken, randen'),
       (TEAL_D, 'Donker blauwgroen', '--formheaderback', 'titel kader'), (RED, 'Rood', '--red', 'verplicht, fout'), (GREY, 'Grijs', '--grey', 'hulptekst'),
       ('#666666', 'Middengrijs', '--darkgrey', 'metadata'), ('#dddddd', 'Lichtgrijs', '--lightgrey', 'lijnen')]
pal2 = [(TEAL, 'Blauwgroen donker', 'WCAG 4,5:1', 'links, knoppen, tekst'), (TEAL_L, 'Blauwgroen licht', 'afgeleid', 'kaderachtergrond'), (ORANGE_L, 'Oranje licht', 'afgeleid', 'tag, tip'), (YELLOW, 'Lichtgeel', 'zoals reacties', 'spiekbriefje'),
        (BG, 'Werkvlak', 'afgeleid', 'achtergrond editor'), (OK, 'Groen', 'WCAG 4,5:1', 'in orde (checklist)'), (DIM, 'Gedimd grijs', 'WCAG 4,5:1', 'Markdown-tekens'), (MARK, 'Paars', 'alleen schetsen', 'annotaties')]
for row, items in enumerate([pal, pal2]):
    for i, (col, name, var, use) in enumerate(items):
        x, y = 24 + i * 144, 156 + row * 150
        s.rect(x, y, 132, 64, col, LINE if col in ('#ffffff', '#dddddd', YELLOW, BG, TEAL_L, ORANGE_L) else None, rx=4)
        s.text(x, y + 84, name, 13, INK, 700)
        s.text(x, y + 102, f'{col.upper()} · {var}', 11, DARK)
        s.text(x, y + 118, use, 11, GREY)
s.line(24, 470, 1176, 470, LIGHT)
s.text(24, 506, 'Lettertypes', 20, INK, 700)
s.text(1176, 506, 'Lora en Lato (SIL Open Font License), zoals op de site', 13, DARK, anchor='end')
typo = [(SERIF, 32, 700, False, 'Vertrekkend raadslid Bram Hoekstra', 'Kop artikel · Lora 700 · 32/40'),
        (SERIF, 18, 700, False, 'Na twintig jaar neemt Bram Hoekstra afscheid van de raad van Eemstad.', 'Intro (uittreksel) · Lora 700 · 18/26'),
        (SERIF, 17, 400, False, 'Bram Hoekstra was bibliothecaris in de wijk Eemstad-Noord.', 'Lopende tekst en schrijfvlak · Lora 400 · 17/26'),
        (SERIF, 21, 400, True, 'Besluiten vielen zelden in de openbare vergadering', 'Citaat · Lora cursief · 21/28'),
        (SANS, 20, 700, False, 'De eerste zetels', 'Tussenkop (H3) · Lato 700 · 20/26'),
        (SANS, 14, 400, False, 'titel · auteur · uittreksel · beoordelingschecklist', 'Interface en labels · Lato 400/700 · 14/20'),
        (SANS, 13, 700, False, 'OPSLAAN   DRAAG BIJ!   ONDERZOEK', 'Knoppen en menu · Lato 700 hoofdletters · 13'),
        (MONO, 14, 400, False, '### Tussenkop   **vet**   [[Raadsnieuws]]', 'Markdown-tekens · monospace systeemletter · 14 (gedimd #6E7781, 4,6:1)')]
y = 548
for fam, size, w, it, sample, spec in typo:
    s.text(24, y, sample, size, INK, w, fam, italic=it)
    s.text(1176, y, spec, 12, DARK, anchor='end')
    y += max(size + 20, 38)
s.line(24, y, 1176, y, LIGHT)
y += 36
s.text(24, y, 'Iconen', 20, INK, 700)
s.text(1176, y, 'Fork Awesome 1.2, al aanwezig in Hypha · altijd met een woord, behalve B en I', 13, DARK, anchor='end')
icons = [('header', 'Tussenkop'), ('bold', 'Vet'), ('italic', 'Schuin'), ('list-ul', 'Lijst'), ('quote-left', 'Citaat'), ('square-o', 'Kader'),
         ('link', 'Link'), ('picture-o', 'Beeld'), ('sitemap', 'Diagram'), ('table', 'Tabel'), ('superscript', 'Voetnoot'), ('ellipsis-h', 'Meer / blok'),
         ('pencil', 'Schrijven'), ('eye', 'Voorbeeld'), ('columns', 'Naast elkaar'), ('desktop', 'Computer'), ('mobile', 'Telefoon'), ('question-circle', 'Hulp'),
         ('check', 'In orde'), ('times', 'Ontbreekt'), ('exclamation-triangle', 'Tip / let op'), ('info-circle', 'Kader-info'), ('download', 'Download .md'), ('upload', 'Upload'),
         ('file-text-o', '.md-bestand'), ('camera', 'Camera'), ('microphone', 'Dicteren'), ('envelope', 'Mail'), ('twitter', 'Twitter'), ('facebook', 'Facebook'),
         ('font', 'Opmaak'), ('hashtag', 'Markdown'), ('pencil-square-o', 'Vaste velden'), ('arrow-right', 'Invullen'), ('toggle-on', 'Schakelaar'), ('mobile', 'Telefoon liggend')]
y += 26
for i, (ic, name) in enumerate(icons):
    x, yy = 24 + (i % 6) * 194, y + (i // 6) * 52
    s.rect(x, yy, 44, 44, '#F2F4F5', rx=4)
    w = s.icon_width(ic, 22)
    s.icon(ic, x + 22 - w / 2, yy + 30, 22, INK)
    s.text(x + 56, yy + 20, name, 14, INK, 700)
    s.text(x + 56, yy + 37, 'fa-' + ic, 11, DARK, family=MONO)
y += 6 * 52 + 20
s.line(24, y, 1176, y, LIGHT)
y += 36
s.text(24, y, 'Componenten', 20, INK, 700)
y += 22
s.button(24, y, 110, 36, 'opslaan'); s.button(146, y, 110, 36, 'afbreken', 'grey'); s.button(268, y, 150, 36, 'Voorbeeld', 'outline', 14)
s.rect(436, y + 7, 130, 22, ORANGE_L, ORANGE, rx=11); s.text(501, y + 22, 'Raadsnieuws ✕', 12, INK, anchor='middle')
s.rect(584, y + 5, 236, 26, '#E7F5EA', rx=13); s.text(702, y + 23, '● schets · automatisch bewaard', 13, OK, anchor='middle')
y += 56
s.rect(160, y - 4, 132, 30, '#EEF0F1', rx=4); s.rect(163, y - 1, 62, 24, TEAL, rx=3)
s.icon('font', 168, y + 16, 11, '#fff'); s.text(182, y + 16, 'Opmaak', 11.5, '#fff', 700)
s.icon('hashtag', 231, y + 16, 11, GREY); s.text(245, y + 16, 'Markdown', 11.5, GREY)
s.switch_right(500, y + 15, 'toon alles')
s.gobtn(520, y - 1, 'bijsluiter invullen')
s.rect(700, y - 2, 300, 4, ORANGE); s.rect(850, y - 2, 150, 4, BRAND_TEAL)
s.text(700, y + 18, 'band boven de werkbalk: herkenbaar als nieuwe editor', 12, GREY)
for k, it in enumerate(['ONDERZOEK', 'RUBRIEKEN', 'OPINIE']):
    w = len(it) * 8.2 + 18; xx = 840 + sum(len(t) * 8.2 + 24 for t in ['ONDERZOEK', 'RUBRIEKEN', 'OPINIE'][:k])
    s.rect(xx, y + 34, w, 28, ORANGE); s.text(xx + w / 2, y + 53, it, 12.5, INK, anchor='middle')
s.save('00-huisstijl.svg')


#
# 10 iPhone, actual size.
#
def keyboard(s, x0, y0, w):
    #
    # iOS keyboard in portrait, 336 pt high including the suggestion bar.
    #
    s.rect(x0, y0, w, 336, '#D1D4DA')
    s.line(x0 + w / 3, y0 + 10, x0 + w / 3, y0 + 35, '#9AA5B1'); s.line(x0 + 2 * w / 3, y0 + 10, x0 + 2 * w / 3, y0 + 35, '#9AA5B1')
    for k, (t, b) in enumerate([('„Eemstadt”', False), ('Eemstad', True), ('Eemstads', False)]):
        s.text(x0 + w / 6 + k * w / 3, y0 + 28, t, 16, INK, 700 if b else None, anchor='middle')
    rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
    kw, gap = (w - 6 - 9 * 6) / 10, 6
    for ri, row in enumerate(rows):
        ky = y0 + 50 + ri * 54
        off = x0 + 3 + (w - 6 - len(row) * kw - (len(row) - 1) * gap) / 2
        for ci, ch in enumerate(row):
            kx = off + ci * (kw + gap)
            s.rect(kx, ky, kw, 44, '#ffffff', rx=5)
            s.text(kx + kw / 2, ky + 29, ch, 22, INK, anchor='middle')
    ky = y0 + 50 + 3 * 54
    s.rect(x0 + 3, ky, 88, 44, '#AEB4BE', rx=5); s.text(x0 + 47, ky + 28, '123', 16, INK, anchor='middle')
    s.rect(x0 + 97, ky, w - 194, 44, '#ffffff', rx=5); s.text(x0 + w / 2, ky + 28, 'spatie', 16, INK, anchor='middle')
    s.rect(x0 + w - 91, ky, 88, 44, '#AEB4BE', rx=5); s.text(x0 + w - 47, ky + 28, 'return', 16, INK, anchor='middle')
    s.icon('microphone', x0 + w - 42, y0 + 318, 20, GREY)
    s.rect(x0 + w / 2 - 67, y0 + 322, 134, 5, INK, rx=3)


W, H = 393, 852
s = Svg(W + 200, H + 140, 'iPhone 15, staand, op ware grootte (393 × 852 pt): schrijven met het schermtoetsenbord', bg='#fff')
X0, Y0 = 30, 70
s.text(X0 + W / 2 + 12, 40, 'iPhone 15 – staand – 100% (393 × 852 pt)', 16, INK, 700, anchor='middle')
s.rect(X0 - 12, Y0 - 12, W + 24, H + 24, INK, rx=66)
s.rect(X0, Y0, W, H, '#fff', rx=55)
s.add(f'<g transform="translate({X0} {Y0})">')
s.text(52, 34, '9:41', 17, INK, 700)
s.rect(140, 11, 113, 34, INK, rx=17)
s.rect(330, 22, 25, 12, 'none', INK, rx=3); s.rect(332, 24, 18, 8, INK, rx=1)
s.line(0, 110, W, 110, LIGHT)
s.logo(16, 60, 150)
s.button(W - 112, 62, 96, 36, 'opslaan', 'primary', 14)
s.text(16, 138, '‹ afbreken', 17, TEAL)
s.text(W - 16, 138, '● schets · 14:32', 14, OK, anchor='end')
s.text(16, 172, 'Vertrekkend raadslid Bram Hoekstra…', 15, INK, 700, SERIF)
s.line(0, 186, W, 186, LIGHT)
s.editbar(0, 187, W, 'markdown')
s.text(16, 258, '<tspan fill="#6E7781" font-weight="400">### </tspan>Een nieuwe partij', 20, INK, 700, raw=True)
lines = ['Bij de verkiezingen van 2018', 'groeide de partij naar vier', 'zetels, vooral in de nieuwe', 'wijken van',
         '<tspan fill="#be0709" text-decoration="underline">Eemstadt</tspan>|']
for k, t in enumerate(lines):
    s.text(16, 294 + k * 28, t, 18, INK, family=SERIF, raw=True)
KB = H - 336
s.rect(0, KB - 46, W, 46, '#F2F3F4'); s.line(0, KB - 46, W, KB - 46, LINE)
for k, ic in enumerate(['pencil', 'eye', 'header', 'bold', 'italic', 'list-ul', 'quote-left', 'link']):
    cx = W / 8 * (k + 0.5)
    w = s.icon_width(ic, 20)
    #
    # First the view switch (write is on), then the formatting buttons; the bar scrolls sideways for the rest.
    #
    if k == 0: s.rect(cx - 20, KB - 40, 40, 34, CARD, LINE, rx=6)
    if k == 1: s.line(W / 4, KB - 38, W / 4, KB - 8, LINE)
    s.icon(ic, cx - w / 2, KB - 16, 20, INK if k != 1 else GREY)
keyboard(s, 0, KB, W)
s.add('</g>')
s.mark(1, X0, Y0 + KB - 46); s.mark(2, X0, Y0 + KB + 22); s.mark(3, X0, Y0 + 252); s.mark(4, X0 + 104, Y0 + 194)
notes = ['Werkbalk boven het', 'toetsenbord: eerst', 'schrijven | voorbeeld,', 'dan de knoppen,', 'van 49 × 46 pt', '(minimaal 44 pt).', 'Opmaak of Markdown', 'kies je bovenaan', 'het tekstvak.', '', 'iOS-suggesties,', 'autocorrectie en',
         'dicteren werken', 'gewoon.', '', 'Geen tabbladen:', 'titel, bijsluiter en', 'bronnen staan in', 'de front matter.']
for k, t in enumerate(notes):
    s.text(X0 + W + 36, Y0 + 520 + k * 20, t, 13, GREY)
s.save('10-iphone.svg')


#
# 11 iPad, actual size.
#
W, H = 1180, 820
s = Svg(W + 80, H + 120, 'iPad Air 11 inch, liggend, op ware grootte (1180 × 820 pt), met toetsenbord: Naast elkaar', bg='#fff')
X0, Y0 = 40, 76
s.text(X0 + W / 2, 40, 'iPad Air 11" – liggend, met hardwaretoetsenbord – 100% (1180 × 820 pt)', 16, INK, 700, anchor='middle')
s.rect(X0 - 20, Y0 - 20, W + 40, H + 40, INK, rx=36)
s.rect(X0, Y0, W, H, '#fff', rx=18)
s.add(f'<g transform="translate({X0} {Y0})">')
s.text(24, 18, '9:41  ma 26 okt', 13, INK, 700)
s.rect(1130, 8, 25, 12, 'none', INK, rx=3); s.rect(1132, 10, 18, 8, INK, rx=1)
s.logo(24, 28, 224)
x = W - 24
for it in ['ZOEK', 'GEHEUGEN', 'DOSSIERS', 'OPINIE', 'RUBRIEKEN', 'ONDERZOEK']:
    w = len(it) * 8.2 + 18; x -= w
    s.rect(x, 56, w, 28, ORANGE); s.text(x + w / 2, 75, it, 12.5, INK, anchor='middle'); x -= 6
s.line(0, 98, W, 98, LIGHT)
s.text(24, 134, TITLE, 22, INK, 700, SERIF)
s.button(W - 232, 112, 100, 36, 'afbreken', 'grey'); s.button(W - 124, 112, 100, 36, 'opslaan')
s.rect(0, 158, W, 1, LIGHT)
s.toolbar(24, 168, W - 48, modes=True, strip_w=W / 2 - 24)
s.add('<g transform="translate(0 36)">')
s.rect(24, 212, W - 48, 520, CARD, LINE)
s.line(W / 2, 212, W / 2, 732)
code = ['<tspan fill="#6E7781">### </tspan><tspan font-weight="700">De eerste zetels</tspan>', '',
        'Hij richtte met een paar buren de', 'wijkpartij Open Eemstad op. In 2006', 'haalde die',
        '<tspan fill="#6E7781">**</tspan><tspan font-weight="700">meteen twee zetels</tspan><tspan fill="#6E7781">**</tspan>.', '',
        '<tspan fill="#6E7781">&gt; [!info]</tspan> Open Eemstad in het kort', '<tspan fill="#6E7781">&gt;</tspan> Lokale partij uit Eemstad-',
        '<tspan fill="#6E7781">&gt;</tspan> Noord, opgericht in 2005.', '<tspan fill="#6E7781">&gt;</tspan> Twee zetels in 2006.', '',
        '<tspan fill="#6E7781">```mermaid</tspan>', 'timeline', '    2006 : twee zetels', '    2014 : een jaar wethouder', '    2026 : afscheid',
        '<tspan fill="#6E7781">```</tspan>|']
for k, t in enumerate(code):
    s.text(48, 248 + k * 26, t, 16, INK, family=MONO, raw=True)
px = W / 2 + 28
s.text(px, 252, 'De eerste zetels', 20, INK, 700)
for k, t in enumerate(['Hij richtte met een paar buren de wijkpartij Open', 'Eemstad op. Bij de verkiezingen van 2006 haalde',
                       'die <tspan font-weight="700">meteen twee zetels</tspan>.']):
    s.text(px, 288 + k * 27, t, 17, INK, family=SERIF, raw=True)
s.rect(px, 370, 520, 92, TEAL_L); s.rect(px, 370, 4, 92, TEAL)
s.icon('info-circle', px + 18, 398, 15, TEAL_D); s.text(px + 40, 398, 'Open Eemstad in het kort', 15, TEAL_D, 700)
s.text(px + 18, 424, 'Lokale partij uit Eemstad-Noord, opgericht in', 15)
s.text(px + 18, 446, '2005. Twee zetels in 2006, vier in 2018.', 15)
s.line(px + 10, 560, px + 510, 560, GREY, 2)
for k, (yr, t, col, fill) in enumerate([('2006', 'twee zetels', SERIES[0], SERIES_L[0]), ('2014', 'een jaar wethouder', SERIES[1], SERIES_L[1]), ('2026', 'afscheid', SERIES[2], SERIES_L[2])]):
    bx = px + 20 + k * 170
    s.rect(bx, 512, 130, 32, fill, col, rx=4); s.text(bx + 65, 533, yr, 14, INK, 700, anchor='middle')
    s.line(bx + 65, 544, bx + 65, 590, col, 1, '4 3')
    s.text(bx + 65, 610, t, 13, anchor='middle')
s.add('</g>')
s.rect(W / 2 - 260, 780, 520, 30, '#F2F3F4', LINE, rx=15)
s.text(W / 2, 800, '⌘B vet · ⌘I schuin · ⌘K link · ⌘S opslaan · / blok invoegen', 13, GREY, anchor='middle')
s.add('</g>')
s.mark(1, X0 + 24, Y0 + 168); s.mark(2, X0 + W / 2, Y0 + 272); s.mark(4, X0 + 124, Y0 + 216); s.mark(3, X0 + W / 2 - 260, Y0 + 795)
s.save('11-ipad.svg')
#
# Number badges for the legends.
#
for n in range(1, 10):
    b = Svg(26, 26, f'Nummer {n} in de schetsen', bg='none')
    b.parts = []
    b.embed_fonts = False  # klein houden; cijfer in Lato/Helvetica
    b.circle(13, 13, 13, MARK)
    b.text(13, 18, str(n), 14, '#fff', 700, anchor='middle')
    b.save(f'nr-{n}.svg')
if os.environ.get('COLLECT'): json.dump(SEEN, open(os.path.join(OUT, 'teksten.json'), 'w'), ensure_ascii=False, indent=0)
if MISSING: print('no translation for:', json.dumps(sorted(MISSING), ensure_ascii=False), len(MISSING))
print('ok')
