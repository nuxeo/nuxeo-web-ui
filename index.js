import { config } from '@nuxeo/nuxeo-elements';
import { importHTML, importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import { setFallbackNotificationTarget } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';

// RTL configuration setup
const setupRTLSupport = () => {
  window.nuxeo = window.nuxeo || {};
  window.nuxeo.I18n = window.nuxeo.I18n || {};
  const userLanguage = navigator.language || navigator.userLanguage || 'en';
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  const isRTL = rtlLanguages.some((lang) => userLanguage?.startsWith(lang));
  window.nuxeo.I18n.direction = isRTL ? 'rtl' : 'ltr';
  document.documentElement.dir = window.nuxeo.I18n.direction;
};

// To fix WEBUI-833 and to disable the Roboto font request
const disableRobotoFont = () => {
  window.polymerSkipLoadingFontRoboto = true;
};
const loadApp = () => import(/* webpackMode: "eager" */ './elements/nuxeo-app.js');
const loadLegacy = () => import(/* webpackMode: "eager" */ './legacy.js');
const loadBundle = () =>
  import('./elements/nuxeo-web-ui-bundle.html').then(({ default: bundleHtml }) => importHTML(bundleHtml));
const loadAddons = async () => {
  const bundles = [...Nuxeo.UI.bundles, 'nuxeo-spreadsheet'];
  // load addons / bundles
  // NXP-26977: await loading of addons
  await Promise.all(
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
const setupApp = async () =>
  customElements.whenDefined('nuxeo-app').then(() => {
    if (Nuxeo && Nuxeo.UI) {
      Nuxeo.UI.app = document.querySelector('nuxeo-app');
      if (!Nuxeo.UI.app) {
        console.error('could not find nuxeo-app');
      }
      Nuxeo.UI.app.setAttribute('dir', window.nuxeo.I18n.direction);
      setFallbackNotificationTarget(Nuxeo.UI.app);
    } else {
      console.error('could not find nuxeo-app');
    }
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
  .then(disableRobotoFont)
  .then(setupRTLSupport)
  .then(loadApp)
  .then(loadLegacy)
  .then(loadBundle)
  .then(setupApp)
  .then(loadRouting)
  .then(loadAddons);
