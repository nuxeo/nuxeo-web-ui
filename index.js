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
      const load = url.endsWith('.html')
        ? new Promise((resolve, reject) => importHref(url, resolve, reject))
        : import(
            /* webpackChunkName: "[request]" */
            /* webpackInclude: /addons\/[^\/]+\/index.js$/ */
            // eslint-disable-next-line comma-dangle
            `./addons/${url}`
          ).catch(() => import(/* webpackIgnore: true */ `./${url}.bundle.js`));
      // A missing or broken optional addon bundle (e.g. a server package like nuxeo-platform-3d
      // that is installed on the server but has no resolvable client bundle) must not reject the
      // whole bootstrap chain. Isolate each addon load and log a warning instead of failing startup.
      return Promise.resolve(load).catch((e) => console.warn(`Failed to load addon bundle "${url}":`, e));
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
    // Wrap importHref in a promise so the startup chain awaits routing.html actually loading
    // and load errors reject (surface) instead of being swallowed, matching the import() branch.
    return new Promise((resolve, reject) => {
      importHref(Nuxeo.UI.app.resolveUrl('routing.html'), resolve, reject);
    });
  }
  return import(/* webpackMode: "eager" */ './elements/routing.js');
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
  // Load addons before routing: addons register their config contributions (e.g. blob
  // enrichers like `wopi`) and slot content at import time. Routing dispatches the initial route
  // when loaded, which triggers the first document fetch. If addons load after routing starts, that
  // first fetch is sent without the addon enrichers, so enricher-dependent blob actions (e.g. the
  // WOPI "open" icon) are missing until a client-side re-navigation re-fetches the document
  // (WEBUI-1978, WEBUI-1715 regression). setupApp still runs first so Nuxeo.UI.app is available to
  // addons.
  .then(loadAddons)
  .then(loadRouting);
