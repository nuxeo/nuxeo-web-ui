import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';

// load app
import './elements/nuxeo-app.js';

// load Web UI bundle
import html from './elements/nuxeo-web-ui-bundle.html';

const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

// load addons / bundles
// NXP-26977: await loading of addons
let pkgPromises = [];
/// #if NO_HTML_IMPORTS
// eslint-disable-next-line no-undef
__PACKAGES__.forEach((pkg) =>
  pkgPromises.push(
    import(
      /* webpackChunkName: "[request]" */
      /* webpackInclude: /addons\/[^\/]+\/[^\/]+\.js$/ */
      // eslint-disable-next-line comma-dangle
      `./addons/${pkg}`
    ),
  ),
);
/// #endif
pkgPromises = pkgPromises.concat(
  Nuxeo.UI.bundles.map((url) => {
    if (url.endsWith('.html')) {
      return new Promise((resolve, reject) => importHref(url, resolve, reject));
    }
    /// #if !NO_HTML_IMPORTS
    return import(
      /* webpackChunkName: "[request]" */
      /* webpackInclude: /addons\/[^\/]+\/[^\/]+\.js$/ */
      // eslint-disable-next-line comma-dangle
      `./addons/${url}`
    );
    /// #else
    // eslint-disable-next-line no-unreachable
    return Promise.resolve();
    /// #endif
  }),
);
Promise.all(pkgPromises).then(() => import(/* webpackMode: "eager" */ './elements/routing.js'));
