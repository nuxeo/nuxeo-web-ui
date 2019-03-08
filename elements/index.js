import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import './nuxeo-app.js';

// load Web UI bundle
import html from './nuxeo-web-ui-bundle.html';
const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

// load bundles
Nuxeo.UI.bundles.forEach((url) => importHref(url));

import './routing.js';
