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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@polymer/iron-icon/iron-icon.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-breadcrumb`
@group Nuxeo UI
@element nuxeo-breadcrumb
*/
Polymer({
  _template: html`
    <style>
      :host {
        min-height: 3em;
        @apply --layout-flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .breadcrumb {
        margin: 0.5em 1em 0 0;
        @apply --layout-horizontal;
      }

      .ancestors {
        display: block;
        line-height: 2em;
        font-size: 0.75rem;
        margin-top: -3px;
      }

      .breadcrumb-item {
        text-decoration: none;
      }

      .current {
        font-weight: 400;
        display: initial;
        white-space: nowrap;
        color: var(--nuxeo-app-header);
      }

      .current-icon iron-icon {
        width: 1.6rem;
        height: 1.5rem;
        margin: 0.3em 0.5rem 0 0;
        background-color: rgba(255, 255, 255, 0.7);
        padding: 0.2em;
        border-radius: 2px;
      }

      .ancestors a,
      .breadcrumb-divider {
        opacity: 0.5;
        font-weight: 300;
      }

      .breadcrumb-divider {
        vertical-align: middle;
      }

      .ancestors a {
        @apply --nuxeo-link;
      }

      a:hover {
        color: var(--nuxeo-link-hover-color);
        opacity: 1;
      }

      .doc-path,
      .ancestors {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ancestors span.breadcrumb-item:last-of-type .breadcrumb-divider {
        display: none;
      }

      a.breadcrumb-item-ancestor:nth-last-child(-n + 1),
      a.breadcrumb-item-ancestor:nth-last-child(-n + 2) a.breadcrumb-item-ancestor:nth-last-child(-n + 3) {
        display: inline-block;
      }

      .left-ellipsis {
        direction: rtl;
        text-align: left;
      }

      .right-ellipsis {
        direction: ltr;
        text-align: right;
      }

      @media (max-width: 1024px) {
        .current-icon {
          display: none;
        }
      }
    </style>

    <nuxeo-connection id="nxcon" url="{{url}}"></nuxeo-connection>

    <div class="breadcrumb">
      <div class="current-icon">
        <iron-icon src="[[_icon(document, url)]]"></iron-icon>
      </div>
      <div class$="doc-path [[_ellipsisDirection()]]">
        <a href$="[[urlFor('browse', document.path)]]" class="current breadcrumb-item breadcrumb-item-current">
          [[_title(document)]]
        </a>
        <div class="ancestors">
          <template is="dom-repeat" items="[[_breadcrumb(document)]]">
            <span class$="breadcrumb-item [[_computeCssClass(index, document)]]">
              <a href$="[[urlFor('browse', item.path)]]">
                <span class="breadcrumb-item-title">[[item.title]]</span>
              </a>
              <span class="breadcrumb-divider">&gt;</span>
            </span>
          </template>
        </div>
      </div>
    </div>
  `,

  is: 'nuxeo-breadcrumb',
  behaviors: [RoutingBehavior, I18nBehavior],

  properties: {
    document: {
      type: Object,
    },
  },

  _breadcrumb() {
    if (this._enrichers) {
      return this._enrichers.breadcrumb.entries.slice(0, this._enrichers.breadcrumb.entries.length - 1);
    }
  },

  _computeCssClass(index) {
    if (this._enrichers) {
      if (index === this._enrichers.breadcrumb.entries.length - 1) {
        return 'breadcrumb-item-current';
      }
      if (index === this._enrichers.breadcrumb.entries.length - 2) {
        return 'breadcrumb-item-parent';
      }
      if (index === this._enrichers.breadcrumb.entries.length - 3) {
        return 'breadcrumb-item-grand-parent';
      }
      return 'breadcrumb-item-ancestor';
    }
  },

  _title(document) {
    if (document) {
      return document.type === 'Root' ? this.i18n('browse.root') : document.title;
    }
  },

  _icon(document, url) {
    if (document && document.properties && document.properties['common:icon']) {
      return url ? url + document.properties['common:icon'] : '';
    }
    return '';
  },

  _ellipsisDirection() {
    if (document.dir !== 'rtl') {
      return 'left-ellipsis';
    }
    return 'right-ellipsis';
  },

  get _enrichers() {
    return this.document && this.document.contextParameters;
  },
});
