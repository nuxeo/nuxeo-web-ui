// load app
import './elements/nuxeo-app.js';

// expose moment for compat
import moment from '@nuxeo/moment';
// expose page for compat
import page from '@nuxeo/page/page.mjs';

// expose Polymer and PolymerElement for 1.x and 2.x compat
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import * as Async from '@polymer/polymer/lib/utils/async.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';

// expose Polymer behaviors for compat
import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { IronValidatableBehavior } from '@polymer/iron-validatable-behavior/iron-validatable-behavior.js';
import { IronValidatorBehavior } from '@polymer/iron-validator-behavior/iron-validator-behavior.js';

// expose behaviors for compat
import { AggregationBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-aggregation/nuxeo-aggregation-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import { PageProviderDisplayBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-page-provider-display-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { UploaderBehavior } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
import { DocumentContentBehavior } from './elements/nuxeo-results/nuxeo-document-content-behavior.js';
import { ChartDataBehavior } from './elements/nuxeo-admin/nuxeo-chart-data-behavior.js';

// load Web UI bundle
import html from './elements/nuxeo-web-ui-bundle.html';

window.moment = moment;
window.page = page;

// expose commonly used legacy helpers for compat
Object.assign(Polymer, { dom, importHref, mixinBehaviors, Debouncer, Async });
window.Polymer = Polymer;
window.PolymerElement = PolymerElement;
window.importHref = importHref;
Polymer.IronOverlayBehavior = IronOverlayBehavior;
Polymer.IronResizableBehavior = IronResizableBehavior;
Polymer.IronValidatableBehavior = IronValidatableBehavior;
Polymer.IronValidatorBehavior = IronValidatorBehavior;
Nuxeo.AggregationBehavior = AggregationBehavior;
Nuxeo.ChartDataBehavior = ChartDataBehavior;
Nuxeo.DocumentContentBehavior = DocumentContentBehavior;
Nuxeo.FiltersBehavior = FiltersBehavior;
Nuxeo.FormatBehavior = FormatBehavior;
Nuxeo.I18nBehavior = I18nBehavior;
Nuxeo.LayoutBehavior = LayoutBehavior;
Nuxeo.PageProviderDisplayBehavior = PageProviderDisplayBehavior;
Nuxeo.RoutingBehavior = RoutingBehavior;
Nuxeo.UploaderBehavior = UploaderBehavior;

const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

const isEnabled = (flag) => Nuxeo.UI.config[flag] && String(Nuxeo.UI.config[flag].enabled) === 'true';

const bundles = [...Nuxeo.UI.bundles, ...(isEnabled('spreadsheet') ? ['nuxeo-spreadsheet'] : [])];

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
    );
  }),
)
  .then(() => customElements.whenDefined('nuxeo-app'))
  .then(() => {
    Nuxeo.UI.app = document.querySelector('nuxeo-app');
    if (!Nuxeo.UI.app) {
      console.error('could not find nuxeo-app');
    }
  })
  .then(async () => {
    if (Nuxeo.UI.config.router && Nuxeo.UI.config.router.htmlImport) {
      importHref(Nuxeo.UI.app.resolveUrl('routing.html'));
    } else {
      return import(/* webpackMode: "eager" */ './elements/routing.js');
    }
  });
