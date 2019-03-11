import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';

// Nuxeo.UI namespace
const Nuxeo = window.Nuxeo = window.Nuxeo || {};
Nuxeo.UI = Nuxeo.UI || {};

// default configuration
Nuxeo.UI.config = Nuxeo.UI.config || {
  fetch: {
    document: ['properties']
  },
  enrichers: {
    document: [
      'hasContent',
      'firstAccessibleAncestor',
      'permissions',
      'breadcrumb',
      'preview',
      'favorites',
      'subscribedNotifications',
      'thumbnail',
      'renditions',
      'pendingTasks',
      'runnableWorkflows',
      'runningWorkflows',
      'collections',
      'audit',
      'subtypes',
      'tags',
      'publications'
    ],
    blob: ['appLinks']
  },
  dateFormat: 'LL',
  dateTimeFormat: 'LLL'
};

// load app
import './elements/nuxeo-app.js';

// load Web UI bundle
import html from './elements/nuxeo-web-ui-bundle.html';
const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

// load addons / bundles
// NXP-26977: await loading of addons
Promise.all(Nuxeo.UI.bundles.map((url) => {
  if (url.endsWith('.html')) {
    return new Promise((resolve, reject) => importHref(url, resolve, reject));
  } else {
    return import(
      /* webpackChunkName: "[request]" */
      /* webpackInclude: /addons\/[^\/]+\/[^\/]+\.js$/ */
      `./addons/${url}`
    );
  }
})).then(() => import(/* webpackMode: "eager" */ './elements/routing.js'));
