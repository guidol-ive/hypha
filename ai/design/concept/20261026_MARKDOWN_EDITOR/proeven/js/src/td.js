import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
window.makeTD = () => { const t = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*' }); t.use(gfm); return t; };
