import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import './elements/nuxeo-app.js';

// load Web UI bundle
import html from './elements/nuxeo-web-ui-bundle.html';
const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

// load addons / bundles
Nuxeo.UI.bundles.forEach((url) => {
  if (url.endsWith('.html')) {
    importHref(url);
  } else {
    import(
      /* webpackChunkName: "[request]" */
      /* webpackInclude: /addons\/[^\/]+\/[^\/]+\.js$/ */
      `./addons/${url}`
    );
  }
});

import './elements/routing.js';
