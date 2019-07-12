import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';

// load app
import './elements/nuxeo-app.js';

// load Web UI bundle
import html from './elements/nuxeo-web-ui-bundle.html';

const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

const bundles = Array.isArray(Nuxeo.UI.bundles) ? Nuxeo.UI.bundles : Nuxeo.UI.bundles.split(/[\s,]+/);

// load addons / bundles
// NXP-26977: await loading of addons
Promise.all(
  bundles.map((url) => {
    if (url.endsWith('.html')) {
      return new Promise((resolve, reject) => importHref(url, resolve, reject));
    }
    return import(/* webpackChunkName: "[request]" */
    /* webpackInclude: /addons\/[^\/]+\/[^\/]+\.js$/ */
    // eslint-disable-next-line comma-dangle
    `./addons/${url}`);
  }),
).then(() => import(/* webpackMode: "eager" */ './elements/routing.js'));
