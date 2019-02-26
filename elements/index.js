import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import './nuxeo-app.js';

// load bundles
Nuxeo.UI.bundles.forEach((url) => importHref(url));

import './routing.js';
