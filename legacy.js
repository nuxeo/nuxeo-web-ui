// expose moment for compat
import moment from '@nuxeo/moment';
// expose page for compat
import page from '@nuxeo/page/page.mjs';

// expose Polymer and PolymerElement for 1.x and 2.x compat
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import * as Async from '@polymer/polymer/lib/utils/async.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import * as RenderStatus from '@polymer/polymer/lib/utils/render-status.js';

// expose Polymer behaviors for compat
import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { IronValidatableBehavior } from '@polymer/iron-validatable-behavior/iron-validatable-behavior.js';
import { IronValidatorBehavior } from '@polymer/iron-validator-behavior/iron-validator-behavior.js';
import { Templatizer } from '@polymer/polymer/lib/legacy/templatizer-behavior.js';

// expose behaviors for compat
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
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

window.moment = moment;
window.page = page;

// expose commonly used legacy helpers for compat
Object.assign(Polymer, { dom, html, importHref, mixinBehaviors, Debouncer, Async, RenderStatus });
window.Polymer = Polymer;
window.PolymerElement = PolymerElement;
window.importHref = importHref;
Polymer.IronOverlayBehavior = IronOverlayBehavior;
Polymer.IronResizableBehavior = IronResizableBehavior;
Polymer.IronValidatableBehavior = IronValidatableBehavior;
Polymer.IronValidatorBehavior = IronValidatorBehavior;
Polymer.Templatizer = Templatizer;
Nuxeo.NotifyBehavior = NotifyBehavior;
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
