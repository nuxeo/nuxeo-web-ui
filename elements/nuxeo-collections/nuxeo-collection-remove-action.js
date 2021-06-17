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
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { SelectAllBehavior } from '../nuxeo-select-all-behavior.js';

/**
`nuxeo-collection-remove-action`
@group Nuxeo UI
@element nuxeo-collection-remove-action
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-operation-button
      id="bulkOpBtn"
      icon="nuxeo:remove"
      input="[[view]]"
      event="refresh"
      label="[[_label]]"
      operation="Collection.RemoveFromCollection"
      params="[[_params(collection.*)]]"
      show-label="[[showLabel]]"
      tooltip-position="[[tooltipPosition]]"
      sync-indexing
      hidden="[[!_isAvailable(members, collection)]]"
    >
    </nuxeo-operation-button>
  `,

  is: 'nuxeo-collection-remove-action',
  behaviors: [SelectAllBehavior, NotifyBehavior, I18nBehavior],

  properties: {
    members: {
      type: Object,
    },
    collection: {
      type: Object,
    },

    tooltipPosition: {
      type: String,
      value: 'bottom',
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
      computed: '_computeLabel(i18n)',
    },
  },

  attached() {
    // capture the click event on the capture phase to set the nuxeo-operation-button properties
    this.$.bulkOpBtn.addEventListener('click', this._remove.bind(this), { capture: true });
  },

  detached() {
    this.$.bulkOpBtn.removeEventListener('click', this._remove.bind(this));
  },

  _params() {
    return {
      collection: this.collection.uid,
    };
  },

  _remove(e) {
    e.preventDefault();
    e.stopPropagation();
    this.remove();
  },

  remove() {
    this.bulkOpBtn._execute().then(() => { this.members = []; });
  },

  _isAvailable(members, collection) {
    if (collection && collection.contextParameters && collection.contextParameters.permissions) {
      // NXP-21408: prior to 8.10-HF01 the permissions enricher wouldn't return ReadCanCollect
      // Action will therefore not be available
      return collection.contextParameters.permissions.indexOf('WriteProperties') > -1;
    }
    return false;
  },

  _computeLabel() {
    return this.i18n('collections.remove');
  },
});
