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

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-clipboard-toggle-button`
@group Nuxeo UI
@element nuxeo-clipboard-toggle-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      :host([in-clipboard]) {
        color: var(--icon-toggle-pressed-color, var(--nuxeo-action-color-activated));
      }
    </style>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="toggle">
        <paper-icon-button icon="[[icon]]" active="[[inClipboard]]" noink aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[_label]]</span>
        <nuxeo-tooltip>[[_label]]</nuxeo-tooltip>
      </div>
    </template>
  `,

  is: 'nuxeo-clipboard-toggle-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
      observer: '_update',
    },

    clipboard: {
      type: Object,
      observer: '_clipboardChanged',
    },

    /**
     * Icon to use (iconset_name:icon_name).
     */
    icon: {
      type: String,
      value: 'icons:content-paste',
    },

    inClipboard: {
      type: Boolean,
      notify: true,
      reflectToAttribute: true,
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    _label: {
      type: String,
      computed: '_computeLabel(inClipboard, i18n)',
    },
  },

  _isAvailable(doc) {
    return !this.isTrashed(doc) && !this.hasType(doc, 'Favorites') && !this.isVersion(doc) && !this.isProxy(doc);
  },

  toggle() {
    if (this.clipboard.contains(this.document)) {
      this.clipboard.remove(this.document);
      this.fire('removed-from-clipboard', { docId: this.document.uid });
    } else {
      this.clipboard.add(this.document);
    }
  },

  _computeLabel(inClipboard) {
    return this.i18n(`clipboardToggleButton.tooltip.${inClipboard ? 'remove' : 'add'}`);
  },

  _update() {
    this.inClipboard = this.clipboard && this.document && this.clipboard.contains(this.document);
  },

  _clipboardChanged(newValue, oldValue) {
    this._listener = this._listener || this._update.bind(this);
    if (oldValue) {
      oldValue.removeEventListener('documents-changed', this._listener);
    }
    if (newValue) {
      newValue.addEventListener('documents-changed', this._listener);
    }
    this._update();
  },
});
