/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import '@polymer/iron-flex-layout/iron-flex-layout.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/social-icons.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import './nuxeo-unpublish-button.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
      :host {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-justified;
        padding: 8px;
        margin-bottom: 16px;
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
        background-color: var(--nuxeo-box);
      }

      iron-icon {
        margin: 0 .5em;
        width: 1.5em;
      }
    </style>

    <nuxeo-document id="srcDoc" loading="{{loadingSrc}}">
    </nuxeo-document>

    <div class="layout horizontal" hidden\$="[[loadingSrc]]">
      <iron-icon icon="icons:info"></iron-icon>
      <div>
        <a href\$="[[_srcUrl(_src)]]" disabled\$="[[_srcDeleted]]">
          [[_infoLabel(_srcDeleted)]]
        </a>
      </div>
    </div>
    <nuxeo-unpublish-button document="[[document]]"></nuxeo-unpublish-button>
`,

  is: 'nuxeo-publication-info-bar',
  behaviors: [I18nBehavior, FiltersBehavior, Nuxeo.RoutingBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
      observer: '_updateSrc'
    },
    _redirectDoc: Object,
    _src: Object,
    _srcDeleted: Boolean
  },

  listeners: {
    'nx-unpublish-success': '_redirect'
  },

  _updateSrc: function() {
    this._src = null;
    this._srcDeleted = false;
    if (this.document && this.document.isProxy) {
      this.$.srcDoc.docId = this.document.properties['rend:sourceId'] || this.document.versionableId;
      this.$.srcDoc.get().then(function(src) {
        this._src = src;
        this._redirectDoc =
          (this.document.contextParameters && this.document.contextParameters.firstAccessibleAncestor) || src;
      }.bind(this)).catch(function(err) {
        if (err.status === 404) {
          this._srcDeleted = true;
          return;
        }
        throw err;
      }.bind(this));
    }
  },

  _redirect: function() {
    this.fire('navigate', {'doc': this._redirectDoc});
  },

  _infoLabel: function() {
    return this._srcDeleted ? this.i18n('publication.info.deleted'): this.i18n('publication.info', this.document.title);
  },

  _srcUrl: function() {
    return this._src ? this.urlFor('browse', this._src.path): null;
  }
});
