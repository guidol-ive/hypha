//
// highlight.js with the ten languages of the design (section 10.1), the same as highlight.php on the server.
//
import hljs from 'highlight.js/lib/core';
import php from 'highlight.js/lib/languages/php';
import javascript from 'highlight.js/lib/languages/javascript';
import sql from 'highlight.js/lib/languages/sql';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
for (const [name, language] of Object.entries({ php, javascript, sql, python, xml, css, json, yaml, bash })) hljs.registerLanguage(name, language);
export default hljs;
