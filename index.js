import { config } from '@nuxeo/nuxeo-elements';
import { importHTML, importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import { setFallbackNotificationTarget } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';

const loadApp = () => import(/* webpackMode: "eager" */ './elements/nuxeo-app.js');
const loadLegacy = () => import(/* webpackMode: "eager" */ './legacy.js');
const loadBundle = () =>
  import('./elements/nuxeo-web-ui-bundle.html').then(({ default: bundleHtml }) => importHTML(bundleHtml));
const loadAddons = () => {
  const bundles = [...Nuxeo.UI.bundles, 'nuxeo-spreadsheet'];
  // load addons / bundles
  // NXP-26977: await loading of addons
  Promise.all(
    bundles.map((url) => {
      if (url.endsWith('.html')) {
        return new Promise((resolve, reject) => importHref(url, resolve, reject));
      }
      return import(
        /* webpackChunkName: "[request]" */
        /* webpackInclude: /addons\/[^\/]+\/index.js$/ */
        // eslint-disable-next-line comma-dangle
        `./addons/${url}`
      ).catch(() => import(/* webpackIgnore: true */ `./${url}.bundle.js`));
    }),
  );
};
const setupApp = () =>
  customElements.whenDefined('nuxeo-app').then(() => {
    Nuxeo.UI.app = document.querySelector('nuxeo-app');
    if (!Nuxeo.UI.app) {
      console.error('could not find nuxeo-app');
    }
    setFallbackNotificationTarget(Nuxeo.UI.app);
  });
const loadRouting = async () => {
  if (config.get('router.htmlImport')) {
    importHref(Nuxeo.UI.app.resolveUrl('routing.html'));
  } else {
    return import(/* webpackMode: "eager" */ './elements/routing.js');
  }
};

const ready =
  !navigator.webdriver || window.automationReady
    ? Promise.resolve()
    : new Promise((resolve) => {
        document.addEventListener('automation-ready', resolve);
      });

ready
  .then(loadApp)
  .then(loadLegacy)
  .then(loadBundle)
  .then(loadAddons)
  .then(setupApp)
  .then(loadRouting);
