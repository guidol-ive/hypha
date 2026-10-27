//
// Test data for the paste conversion (plakken.js): clipboard HTML of Word, Google Docs and LibreOffice,
// each with the Markdown it must give. All text is fictional, like the sample article about Eemstad.
//
// Origin of the documents (field 'herkomst'):
//   opname:     captured from the clipboard of the real program (replace the reconstructions with these);
//   export:     the HTML export of the real program, which uses the same filter as its clipboard;
//   nagebouwd:  written by hand after the known structure of that program's clipboard HTML.
//
// New captures: paste in the capture field of plaktest.html and copy the test case it shows.
//
window.PLAKTEST = {};

//
// The Markdown that the test document plaktest/plaktest.md (also .docx and .odt) must give.
//
const VERWACHT_KERN = String.raw`### Nieuwe fietsroute door Eemstad-Noord

De gemeenteraad van Eemstad heeft **dinsdagavond** ingestemd met een *nieuwe* fietsroute. Het plan is ***definitief***, zegt wethouder Ilse Bakker: „We beginnen in het voorjaar.” De kosten – € 2,4 miljoen – komen uit het mobiliteitsfonds. Meer op [de site van de gemeente](https://www.example.org/fietsroute).

#### Wat de raad besloot

- De route loopt langs het stadspark.
  - Er komt een tweede brug.
    - De brug is in 2028 klaar.
- Bewoners mogen **meepraten**.

3. Het college maakt een ontwerp.
4. De raad stemt in juni.
   - Eerst een inspraakavond.
5. De aannemer begint in het najaar.

##### De cijfers

| Onderdeel | Kosten | Klaar |
| --- | ---: | --- |
| **Fietspad** | € 1,6 miljoen | 2027 |
| Brug | € 0,8 miljoen | 2028 |`;

//
// Word for Windows (Microsoft 365): lists as paragraphs with mso-list, equations as OMML in a conditional
// comment with a picture as fallback, empty paragraphs with <o:p>&nbsp;</o:p>.
//
const WORD_HTML = `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv=Content-Type content="text/html; charset=utf-8"><meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15">
<style><!-- p.MsoNormal, li.MsoNormal {margin:0cm;font-size:11.0pt;font-family:"Calibri",sans-serif;} h1 {mso-style-name:"Kop 1";font-size:16.0pt;color:#2F5496;} --></style></head>
<body lang=NL style='tab-interval:35.4pt;word-wrap:break-word'>
<!--StartFragment-->
<h1>Nieuwe fietsroute door Eemstad-Noord<o:p></o:p></h1>
<p class=MsoNormal>De gemeenteraad van Eemstad heeft <b>dinsdagavond</b> ingestemd met een <i>nieuwe</i> fietsroute. Het plan is <b><i>definitief</i></b>, zegt wethouder Ilse Bakker: „We beginnen in het voorjaar.” De kosten – €&nbsp;2,4 miljoen – komen uit het mobiliteitsfonds. Meer op <a href="https://www.example.org/fietsroute"><span style='color:#0563C1'>de site van de gemeente</span></a>.<o:p></o:p></p>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
<h2>Wat de raad besloot<o:p></o:p></h2>
<p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>De route loopt langs het stadspark.<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='margin-left:72.0pt;mso-add-space:auto;text-indent:-18.0pt;mso-list:l0 level2 lfo1'><![if !supportLists]><span style='font-family:"Courier New";mso-fareast-font-family:"Courier New"'><span style='mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span></span><![endif]>Er komt een tweede brug.<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='margin-left:108.0pt;mso-add-space:auto;text-indent:-18.0pt;mso-list:l0 level3 lfo1'><![if !supportLists]><span style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:Wingdings'><span style='mso-list:Ignore'>§<span style='font:7.0pt "Times New Roman"'>&nbsp; </span></span></span><![endif]>De brug is in 2028 klaar.<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Bewoners mogen <b>meepraten</b>.<o:p></o:p></p>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-fareast-font-family:Calibri'><span style='mso-list:Ignore'>3.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Het college maakt een ontwerp.<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-fareast-font-family:Calibri'><span style='mso-list:Ignore'>4.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>De raad stemt in juni.<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='margin-left:72.0pt;mso-add-space:auto;text-indent:-18.0pt;mso-list:l1 level2 lfo2'><![if !supportLists]><span style='font-family:"Courier New";mso-fareast-font-family:"Courier New"'><span style='mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span></span><![endif]>Eerst een inspraakavond.<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-fareast-font-family:Calibri'><span style='mso-list:Ignore'>5.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>De aannemer begint in het najaar.<o:p></o:p></p>
<h3>De cijfers<o:p></o:p></h3>
<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0 style='border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt;mso-yfti-tbllook:1184;mso-padding-alt:0cm 5.4pt 0cm 5.4pt'>
 <tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes'>
  <td width=201 valign=top style='width:150.95pt;border:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal>Onderdeel<o:p></o:p></p></td>
  <td width=201 valign=top style='width:150.95pt;border:solid windowtext 1.0pt;border-left:none;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal align=right style='text-align:right'>Kosten<o:p></o:p></p></td>
  <td width=201 valign=top style='width:150.95pt;border:solid windowtext 1.0pt;border-left:none;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal>Klaar<o:p></o:p></p></td>
 </tr>
 <tr style='mso-yfti-irow:1'>
  <td width=201 valign=top style='width:150.95pt;border:solid windowtext 1.0pt;border-top:none;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal><b>Fietspad<o:p></o:p></b></p></td>
  <td width=201 valign=top style='width:150.95pt;border-top:none;border-left:none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal align=right style='text-align:right'>€&nbsp;1,6 miljoen<o:p></o:p></p></td>
  <td width=201 valign=top style='width:150.95pt;border-top:none;border-left:none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal>2027<o:p></o:p></p></td>
 </tr>
 <tr style='mso-yfti-irow:2;mso-yfti-lastrow:yes'>
  <td width=201 valign=top style='width:150.95pt;border:solid windowtext 1.0pt;border-top:none;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal>Brug<o:p></o:p></p></td>
  <td width=201 valign=top style='width:150.95pt;border-top:none;border-left:none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal align=right style='text-align:right'>€&nbsp;0,8 miljoen<o:p></o:p></p></td>
  <td width=201 valign=top style='width:150.95pt;border-top:none;border-left:none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal>2028<o:p></o:p></p></td>
 </tr>
</table>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
<p class=MsoNormal>Van de 37 raadsleden stemden er 4 tegen: <!--[if gte msEquation 12]><m:oMath><m:f><m:fPr><span style='font-family:"Cambria Math";mso-ascii-font-family:"Cambria Math";mso-hansi-font-family:"Cambria Math";font-style:italic'><m:ctrlPr></m:ctrlPr></span></m:fPr><m:num><i><span style='font-family:"Cambria Math"'><m:r>4</m:r></span></i></m:num><m:den><i><span style='font-family:"Cambria Math"'><m:r>37</m:r></span></i></m:den></m:f><i><span style='font-family:"Cambria Math"'><m:r>≈11%</m:r></span></i></m:oMath><![endif]--><![if !msEquation]><span style='font-size:11.0pt;font-family:"Calibri",sans-serif;position:relative;top:7.0pt;mso-text-raise:-7.0pt'><!--[if gte vml 1]><v:shape id="_x0000_i1025" type="#_x0000_t75" style='width:39pt;height:24.5pt'><v:imagedata src="file:///C:/Users/redactie/AppData/Local/Temp/msohtmlclip1/01/clip_image001.png" o:title="" chromakey="white"/></v:shape><![endif]--><![if !vml]><img width=52 height=33 src="file:///C:/Users/redactie/AppData/Local/Temp/msohtmlclip1/01/clip_image002.png" v:shapes="_x0000_i1025"><![endif]></span><![endif]> van de raad.<o:p></o:p></p>
<p class=MsoNormal><!--[if gte msEquation 12]><m:oMathPara><m:oMath><m:nary><m:naryPr><m:chr m:val="∑"/><span style='font-family:"Cambria Math";font-style:italic'><m:ctrlPr></m:ctrlPr></span></m:naryPr><m:sub><i><span style='font-family:"Cambria Math"'><m:r>i=1</m:r></span></i></m:sub><m:sup><i><span style='font-family:"Cambria Math"'><m:r>n</m:r></span></i></m:sup><m:e><m:sSubSup><m:sSubSupPr><span style='font-family:"Cambria Math";font-style:italic'><m:ctrlPr></m:ctrlPr></span></m:sSubSupPr><m:e><i><span style='font-family:"Cambria Math"'><m:r>x</m:r></span></i></m:e><m:sub><i><span style='font-family:"Cambria Math"'><m:r>i</m:r></span></i></m:sub><m:sup><i><span style='font-family:"Cambria Math"'><m:r>2</m:r></span></i></m:sup></m:sSubSup></m:e></m:nary></m:oMath></m:oMathPara><![endif]--><![if !msEquation]><span style='font-size:11.0pt;font-family:"Calibri",sans-serif;position:relative;top:14.0pt;mso-text-raise:-14.0pt'><!--[if gte vml 1]><v:shape id="_x0000_i1026" type="#_x0000_t75" style='width:43pt;height:38pt'><v:imagedata src="file:///C:/Users/redactie/AppData/Local/Temp/msohtmlclip1/01/clip_image003.png" o:title="" chromakey="white"/></v:shape><![endif]--><![if !vml]><img width=57 height=51 src="file:///C:/Users/redactie/AppData/Local/Temp/msohtmlclip1/01/clip_image004.png" v:shapes="_x0000_i1026"><![endif]></span><![endif]><o:p></o:p></p>
<p class=MsoNormal>De schuine zijde volgt uit <!--[if gte msEquation 12]><m:oMath><i><span style='font-family:"Cambria Math"'><m:r>c=</m:r></span></i><m:rad><m:radPr><m:degHide m:val="on"/><span style='font-family:"Cambria Math";font-style:italic'><m:ctrlPr></m:ctrlPr></span></m:radPr><m:deg></m:deg><m:e><m:sSup><m:sSupPr><span style='font-family:"Cambria Math";font-style:italic'><m:ctrlPr></m:ctrlPr></span></m:sSupPr><m:e><i><span style='font-family:"Cambria Math"'><m:r>a</m:r></span></i></m:e><m:sup><i><span style='font-family:"Cambria Math"'><m:r>2</m:r></span></i></m:sup></m:sSup><i><span style='font-family:"Cambria Math"'><m:r>+</m:r></span></i><m:sSup><m:sSupPr><span style='font-family:"Cambria Math";font-style:italic'><m:ctrlPr></m:ctrlPr></span></m:sSupPr><m:e><i><span style='font-family:"Cambria Math"'><m:r>b</m:r></span></i></m:e><m:sup><i><span style='font-family:"Cambria Math"'><m:r>2</m:r></span></i></m:sup></m:sSup></m:e></m:rad></m:oMath><![endif]--><![if !msEquation]><span style='font-size:11.0pt;font-family:"Calibri",sans-serif;position:relative;top:4.0pt;mso-text-raise:-4.0pt'><img width=74 height=24 src="file:///C:/Users/redactie/AppData/Local/Temp/msohtmlclip1/01/clip_image006.png"></span><![endif]>, met hoek <!--[if gte msEquation 12]><m:oMath><i><span style='font-family:"Cambria Math"'><m:r>α</m:r></span></i></m:oMath><![endif]--><![if !msEquation]><span style='font-size:11.0pt'><img width=11 height=15 src="file:///C:/Users/redactie/AppData/Local/Temp/msohtmlclip1/01/clip_image008.png"></span><![endif]>.<o:p></o:p></p>
<!--EndFragment-->
</body>
</html>`;

//
// Google Docs in Chrome: everything inside <b style="font-weight:normal" id="docs-internal-guid-…">,
// bold and italic as font-weight and font-style on spans, list levels in aria-level.
//
const GSPAN = 'font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;';
const gs = (t, w = 400, st = 'normal') => `<span style="${GSPAN}font-weight:${w};font-style:${st};">${t}</span>`;
const gp = (inner, extra = '') => `<p dir="ltr" style="line-height:1.38;${extra}margin-top:0pt;margin-bottom:0pt;">${inner}</p>`;
const gli = (t, lvl, type) => `<li dir="ltr" style="list-style-type:${type};font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="${lvl}">${gp(t).replace('<p ', '<p role="presentation" ')}</li>`;
const gtd = (inner, extra = '') => `<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">${gp(inner, 'line-height:1.2;' + extra).replace('line-height:1.38;', '')}</td>`;
const UL = '<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">';
const GOOGLE_HTML = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-5d1e7c2a-7fff-4a91-b3c0-8e2f19d4a6b7">`
	+ `<h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;"><span style="font-size:20pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nieuwe fietsroute door Eemstad-Noord</span></h1>`
	+ gp(gs('De gemeenteraad van Eemstad heeft ') + gs('dinsdagavond', 700) + gs(' ingestemd met een ') + gs('nieuwe', 400, 'italic') + gs(' fietsroute. Het plan is ') + gs('definitief', 700, 'italic') + gs(', zegt wethouder Ilse Bakker: „We beginnen in het voorjaar.” De kosten – € 2,4 miljoen – komen uit het mobiliteitsfonds. Meer op ')
		+ `<a href="https://www.example.org/fietsroute" style="text-decoration:none;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#1155cc;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">de site van de gemeente</span></a>` + gs('.'))
	+ `<h2 dir="ltr" style="line-height:1.38;margin-top:18pt;margin-bottom:6pt;"><span style="font-size:16pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Wat de raad besloot</span></h2>`
	+ UL + gli(gs('De route loopt langs het stadspark.'), 1, 'disc') + UL + gli(gs('Er komt een tweede brug.'), 2, 'circle') + UL + gli(gs('De brug is in 2028 klaar.'), 3, 'square') + '</ul></ul>'
	+ gli(gs('Bewoners mogen ') + gs('meepraten', 700) + gs('.'), 1, 'disc') + '</ul><br>'
	+ '<ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;" start="3">' + gli(gs('Het college maakt een ontwerp.'), 1, 'decimal') + gli(gs('De raad stemt in juni.'), 1, 'decimal')
	+ UL + gli(gs('Eerst een inspraakavond.'), 2, 'disc') + '</ul>' + gli(gs('De aannemer begint in het najaar.'), 1, 'decimal') + '</ol>'
	+ `<h3 dir="ltr" style="line-height:1.38;margin-top:16pt;margin-bottom:4pt;"><span style="font-size:14pt;font-family:Arial,sans-serif;color:#434343;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">De cijfers</span></h3>`
	+ '<div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;"><colgroup><col width="200"><col width="200"><col width="200"></colgroup><tbody>'
	+ '<tr style="height:0pt">' + gtd(gs('Onderdeel')) + gtd(gs('Kosten'), 'text-align: right;') + gtd(gs('Klaar')) + '</tr>'
	+ '<tr style="height:0pt">' + gtd(gs('Fietspad', 700)) + gtd(gs('€ 1,6 miljoen'), 'text-align: right;') + gtd(gs('2027')) + '</tr>'
	+ '<tr style="height:0pt">' + gtd(gs('Brug')) + gtd(gs('€ 0,8 miljoen'), 'text-align: right;') + gtd(gs('2028')) + '</tr>'
	+ '</tbody></table></div><br>'
	+ gp(gs('Van de 37 raadsleden stemden er 4 tegen.'))
	+ '</b><br class="Apple-interchange-newline">';

//
// LibreOffice Writer 25.2: real export of plaktest/plaktest.odt with the filter HTML (StarWriter).
// Formulas (Math objects) come along only as pictures named Object1, Object2, ….
//
const LIBREOFFICE_HTML = "<!DOCTYPE html>\n<html>\n<head>\n\t<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\"/>\n\t<title></title>\n\t<meta name=\"generator\" content=\"LibreOffice 25.2.1.2 (MacOSX)\"/>\n\t<meta name=\"created\" content=\"2026-10-27T13:58:16Z\"/>\n\t<meta name=\"changed\" content=\"2026-10-27T13:58:16Z\"/>\n\t<style type=\"text/css\">\n\t\t@page { size: 21.59cm 27.94cm; margin: 2.54cm }\n\t\tp { margin-top: 0.15cm; margin-bottom: 0.15cm; background: transparent }\n\t\th1 { margin-bottom: 0.21cm; background: transparent; page-break-after: avoid }\n\t\th1.western { font-family: \"Arial\", sans-serif; font-weight: bold; font-size: 16pt }\n\t\th1.cjk { font-family: \"Lucida Sans Unicode\"; font-size: 16pt; font-weight: bold }\n\t\th1.ctl { font-family: \"Tahoma\"; font-weight: bold; font-size: 16pt }\n\t\th2 { margin-bottom: 0.21cm; background: transparent; page-break-after: avoid }\n\t\th2.western { font-size: 14pt; font-family: \"Arial\", sans-serif; font-style: italic; font-weight: bold }\n\t\th2.cjk { font-family: \"Lucida Sans Unicode\"; font-weight: bold; font-style: italic; font-size: 14pt }\n\t\th2.ctl { font-weight: bold; font-style: italic; font-family: \"Tahoma\"; font-size: 14pt }\n\t\th3 { margin-bottom: 0.21cm; background: transparent; page-break-after: avoid }\n\t\th3.western { font-family: \"Arial\", sans-serif; font-weight: bold; font-size: 14pt }\n\t\th3.cjk { font-family: \"Lucida Sans Unicode\"; font-size: 14pt; font-weight: bold }\n\t\th3.ctl { font-family: \"Tahoma\"; font-weight: bold; font-size: 14pt }\n\t\ttd p { margin-right: 0.08cm; margin-left: 0.08cm; background: transparent }\n\t\tth p { margin-right: 0.08cm; text-align: left; margin-left: 0.08cm; font-weight: bold; background: transparent }\n\t\ta:link { color: #000080; text-decoration: underline }\n\t</style>\n</head>\n<body lang=\"en-US\" link=\"#000080\" vlink=\"#800000\" dir=\"ltr\"><h1 class=\"western\"><a name=\"nieuwe-fietsroute-door-eemstad-noord\"></a>\nNieuwe fietsroute door Eemstad-Noord</h1>\n<p class=\"first-paragraph\">De gemeenteraad van Eemstad heeft\n<b>dinsdagavond</b> ingestemd met een <i>nieuwe</i> fietsroute. Het\nplan is <i><b>definitief</b></i>, zegt wethouder Ilse Bakker: „We\nbeginnen in het voorjaar.” De kosten – € 2,4 miljoen – komen\nuit het mobiliteitsfonds. Meer op <dfn><a href=\"https://www.example.org/fietsroute\">de\nsite van de gemeente</a></dfn>.</p>\n<h2 class=\"western\"><a name=\"wat-de-raad-besloot\"></a>Wat de raad\nbesloot</h2>\n<ul>\n\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">De route loopt\n\tlangs het stadspark.</p></li>\n</ul>\n<ul>\n\t<ul>\n\t\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">Er komt een\n\t\ttweede brug.</p></li>\n\t</ul>\n</ul>\n<ul>\n\t<ul>\n\t\t<ul>\n\t\t\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">De brug is in\n\t\t\t2028 klaar.</p></li>\n\t\t</ul>\n\t</ul>\n</ul>\n<ul>\n\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">Bewoners mogen\n\t<b>meepraten</b>.</p></li>\n</ul>\n<ol start=\"3\">\n\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">Het college maakt\n\teen ontwerp.</p></li>\n\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">De raad stemt in\n\tjuni.</p></li>\n</ol>\n<ul>\n\t<ul>\n\t\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">Eerst een\n\t\tinspraakavond.</p></li>\n\t</ul>\n</ul>\n<ol start=\"3\">\n\t<li><p style=\"margin-top: 0cm; margin-bottom: 0cm\">De aannemer\n\tbegint in het najaar.</p></li>\n</ol>\n<h3 class=\"western\"><a name=\"de-cijfers\"></a>De cijfers</h3>\n<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n\t<col width=\"85*\"/>\n\t<col width=\"85*\"/>\n\t<col width=\"85*\"/>\n\t<thead>\n\t\t<tr valign=\"top\">\n\t\t\t<th width=\"33%\" style=\"border: none; padding: 0cm\"><p>Onderdeel</p>\n\t\t\t</th>\n\t\t\t<th width=\"33%\" style=\"border: none; padding: 0cm\"><p align=\"right\">\n\t\t\t\tKosten</p>\n\t\t\t</th>\n\t\t\t<th width=\"33%\" style=\"border: none; padding: 0cm\"><p>Klaar</p>\n\t\t\t</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr valign=\"top\">\n\t\t\t<td width=\"33%\" style=\"border: none; padding: 0cm\"><p><b>Fietspad</b></p>\n\t\t\t</td>\n\t\t\t<td width=\"33%\" style=\"border: none; padding: 0cm\"><p align=\"right\">\n\t\t\t\t€ 1,6 miljoen</p>\n\t\t\t</td>\n\t\t\t<td width=\"33%\" style=\"border: none; padding: 0cm\"><p>2027</p>\n\t\t\t</td>\n\t\t</tr>\n\t\t<tr valign=\"top\">\n\t\t\t<td width=\"33%\" style=\"border: none; padding: 0cm\"><p>Brug</p>\n\t\t\t</td>\n\t\t\t<td width=\"33%\" style=\"border: none; padding: 0cm\"><p align=\"right\">\n\t\t\t\t€ 0,8 miljoen</p>\n\t\t\t</td>\n\t\t\t<td width=\"33%\" style=\"border: none; padding: 0cm\"><p>2028</p>\n\t\t\t</td>\n\t\t</tr>\n\t</tbody>\n</table>\n<p class=\"first-paragraph\">Van de 37 raadsleden stemden er 4 tegen: \n<img src=\"plaktest_html_41afb67a.gif\" name=\"Object1\" align=\"absmiddle\" width=\"57\" height=\"23\"/>\n\nvan de raad.</p>\n<p><img src=\"plaktest_html_dcc13db3.gif\" name=\"Object2\" align=\"left\" width=\"35\" height=\"43\">\n  <br clear=\"left\"/>\n</img>\n<br/>\n<br/>\n\n</p>\n<p>De schuine zijde volgt uit \n<img src=\"plaktest_html_85035132.gif\" name=\"Object3\" align=\"absmiddle\" width=\"70\" height=\"20\"/>\n,\nmet hoek \n<img src=\"plaktest_html_608541a0.gif\" name=\"Object4\" align=\"absmiddle\" width=\"10\" height=\"18\"/>\n.</p>\n<div title=\"footer\"><p align=\"center\" style=\"margin-top: 0.51cm; margin-bottom: 0cm\">\n\t<span style=\"background: #c0c0c0\"><sdfield type=PAGE subtype=RANDOM format=PAGE>1</sdfield></span>\n\t\t</p>\n</div>\n</body>\n</html>";

window.PLAKTEST.documenten = [
	{
		id: 'word-windows', programma: 'Word (Microsoft 365) op Windows', herkomst: 'nagebouwd',
		html: WORD_HTML,
		verwacht: VERWACHT_KERN + String.raw`

Van de 37 raadsleden stemden er 4 tegen: $\frac{4}{37}\approx 11\%$ van de raad.

$$
\sum_{i=1}^n x_i^2
$$

De schuine zijde volgt uit $c=\sqrt{a^2+b^2}$, met hoek $\alpha$.`,
		meldingen: []
	},
	{
		id: 'google-docs', programma: 'Google Docs in Chrome', herkomst: 'nagebouwd',
		html: GOOGLE_HTML,
		verwacht: VERWACHT_KERN + `

Van de 37 raadsleden stemden er 4 tegen.`,
		meldingen: [],
		opmerking: 'Zonder formules: in welke vorm Google Docs een vergelijking op het klembord zet, is nog te verifiëren met een echte opname.'
	},
	{
		id: 'libreoffice', programma: 'LibreOffice Writer 25.2 op macOS', herkomst: 'export',
		html: LIBREOFFICE_HTML,
		verwacht: VERWACHT_KERN + String.raw`

Van de 37 raadsleden stemden er 4 tegen: $\text{formule niet overgenomen}$ van de raad.

$\text{formule niet overgenomen}$

De schuine zijde volgt uit $\text{formule niet overgenomen}$ , met hoek $\text{formule niet overgenomen}$ .`,
		meldingen: ['Een formule kwam alleen als plaatje mee en is niet overgenomen; typ haar opnieuw met Formule.'],
		opmerking: 'De spatie voor de komma en de punt staat ook in de HTML van LibreOffice (een regelovergang na het plaatje).'
	}
];

//
// Small cases, one property each.
//
window.PLAKTEST.gevallen = [
	{ naam: 'Omhulsel van Google Docs is geen vet', html: '<b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr"><span style="font-weight:400">gewoon</span></p></b>', verwacht: 'gewoon' },
	{ naam: 'Spatie buiten de vetmarkering', html: '<p><b>vet </b>tekst en <i> schuin</i></p>', verwacht: '**vet** tekst en *schuin*' },
	{ naam: 'Vet en schuin samen', html: '<p><span style="font-weight:700;font-style:italic">beide</span></p>', verwacht: '***beide***' },
	{ naam: 'Tekens die opmaak zouden worden', html: '<p>5 * 3 = 15, a_b en [noot] kosten $4</p>', verwacht: String.raw`5 \* 3 = 15, a\_b en \[noot\] kosten \$4` },
	{ naam: 'Regel die als kop of lijst zou beginnen', html: '<p># geen kop</p><p>1. geen lijst</p>', verwacht: String.raw`\# geen kop

1\. geen lijst` },
	{ naam: 'Zachte regelovergang (Shift+Enter)', html: '<p>Met vriendelijke groet,<br>Redactie</p>', verwacht: 'Met vriendelijke groet,\\\nRedactie' },
	{ naam: 'Geen lege alinea\'s extra', html: '<p class=MsoNormal>een<o:p></o:p></p><p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal>&nbsp;</p><p class=MsoNormal>twee</p>', verwacht: 'een\n\ntwee' },
	{ naam: 'Vaste spaties worden gewone spaties', html: '<p>€&nbsp;10&nbsp;&nbsp;en&nbsp;meer</p>', verwacht: '€ 10 en meer' },
	{ naam: 'Kop 1 tot en met 4', html: '<h1>Een</h1><h2>Twee</h2><h3>Drie</h3><h4>Vier</h4>', verwacht: '### Een\n\n#### Twee\n\n##### Drie\n\n###### Vier' },
	{ naam: 'Geen vet in een kop', html: '<h2><b>Kop</b></h2>', verwacht: '#### Kop' },
	{ naam: 'Genummerd in genummerd', html: '<ol><li>een<ol><li>half</li></ol></li><li>twee</li></ol>', verwacht: '1. een\n   1. half\n2. twee' },
	{ naam: 'Alinea\'s in één lijstitem', html: '<ul><li><p>regel een</p><p>regel twee</p></li></ul>', verwacht: '- regel een\\\n  regel twee' },
	{ naam: 'Samengevoegde cellen', html: '<table><tr><td colspan="2">Kop</td></tr><tr><td>a</td><td>b</td></tr></table>', verwacht: '| Kop |  |\n| --- | --- |\n| a | b |', meldingen: ['Een tabel had samengevoegde cellen; die zijn gesplitst.'] },
	{ naam: 'Sluisteken in een cel', html: '<table><tr><th>a|b</th></tr><tr><td>c</td></tr></table>', verwacht: '| a\\|b |\n| --- |\n| c |' },
	{ naam: 'Afbeelding van de eigen schijf (Word)', html: '<p>Foto: <img src="file:///C:/Users/redactie/clip_image001.png"></p>', verwacht: 'Foto:', meldingen: ['Een afbeelding is niet overgenomen; voeg haar toe met Beeld….'] },
	{ naam: 'Afbeelding als data', html: '<p><img alt="Brug" src="data:image/png;base64,iVBORw0KGgo="></p>', verwacht: '![Brug](beeld/geplakt-1.png)' },
	{ naam: 'Interne link van Word wordt tekst', html: '<p><a href="#_Toc123">Inhoud</a> en <a href="mailto:redactie@example.org">mail</a></p>', verwacht: 'Inhoud en [mail](mailto:redactie@example.org)' },
	{ naam: 'Opmerkingen van Word vallen weg', html: '<p>Tekst<span class=MsoCommentReference>[GL1]</span></p><div style="mso-element:comment-list"><p>Opmerking</p></div>', verwacht: 'Tekst' },
	{ naam: 'Onderstrepen en kleur vallen weg, tekst blijft', html: '<p><u>onder</u> <span style="color:red;font-family:Comic Sans MS">rood</span></p>', verwacht: 'onder rood' },
	{ naam: 'OMML: wortel met graad', omml: '<m:oMath><m:rad><m:deg><m:r>3</m:r></m:deg><m:e><m:r>x</m:r></m:e></m:rad></m:oMath>', verwacht: String.raw`\sqrt[3]{x}` },
	{ naam: 'OMML: integraal met grenzen', omml: '<m:oMath><m:nary><m:naryPr><m:ctrlPr></m:ctrlPr></m:naryPr><m:sub><m:r>0</m:r></m:sub><m:sup><m:r>1</m:r></m:sup><m:e><m:r>f(x)dx</m:r></m:e></m:nary></m:oMath>', verwacht: String.raw`\int_0^1 f(x)dx` },
	{ naam: 'OMML: haakjes en functie', omml: '<m:oMath><m:func><m:fName><m:r><m:rPr><m:sty m:val="p"/></m:rPr>sin</m:r></m:fName><m:e><m:r>x</m:r></m:e></m:func><m:r>⋅</m:r><m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr><m:e><m:r>a+b</m:r></m:e></m:d></m:oMath>', verwacht: String.raw`\sin x\cdot \left[a+b\right]` },
	{ naam: 'OMML: Griekse letters en tekens', omml: '<m:oMath><m:r>Δ</m:r><m:r>t≤2π</m:r></m:oMath>', verwacht: String.raw`\Delta t\le 2\pi` },
	{ naam: 'OMML: matrix', omml: '<m:oMath><m:d><m:e><m:m><m:mr><m:e><m:r>1</m:r></m:e><m:e><m:r>0</m:r></m:e></m:mr><m:mr><m:e><m:r>0</m:r></m:e><m:e><m:r>1</m:r></m:e></m:mr></m:m></m:e></m:d></m:oMath>', verwacht: String.raw`\left(\begin{matrix} 1 & 0 \\ 0 & 1 \end{matrix}\right)` }
];
