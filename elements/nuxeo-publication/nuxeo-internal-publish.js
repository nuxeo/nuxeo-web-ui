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
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import { escapeHTML } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-selectivity.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-document-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '../nuxeo-document-versions/nuxeo-document-versions.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { SelectAllBehavior } from '../nuxeo-select-all-behavior.js';

Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment iron-flex-factors nuxeo-action-button-styles nuxeo-styles">
      :host {
        display: block;
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      .container {
        margin: 2rem;
        padding: 0 1rem 0 0;
        display: inline-block;
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      .versions,
      .options {
        margin-left: 3em;
      }

      label {
        @apply --nuxeo-label;
      }

      .error {
        border-left: 4px solid var(--nuxeo-warn-text);
        color: var(--nuxeo-text-default);
        padding-left: 8px;
        margin-bottom: 8px;
      }
    </style>

    <nuxeo-operation-button
      id="bulkOpBtn"
      poll-interval="[[pollInterval]]"
      on-poll-start="_onPollStart"
      on-response="_onResponse"
      async
      sync-indexing
      hidden
    >
    </nuxeo-operation-button>

    <nuxeo-document id="srcDoc"></nuxeo-document>

    <div class="container">
      <nuxeo-document-suggestion
        id="target"
        required
        label="[[i18n('publication.internal.location')]]"
        placeholder="[[i18n('publication.internal.location.placeholder')]]"
        selected-item="{{publishSpace}}"
        min-chars="0"
        selection-formatter="[[targetFormatter]]"
        enrichers="permissions"
        page-provider="publish_space_suggestion"
        repository="[[document.repository]]"
      >
      </nuxeo-document-suggestion>
      <template is="dom-if" if="[[errorMessage]]">
        <span class="horizontal layout error">[[errorMessage]]</span>
      </template>

      <div class="horizontal layout flex">
        <nuxeo-select
          id="rendition"
          label="[[i18n('publication.internal.renditons.label')]]"
          placeholder="[[i18n('publication.internal.renditons.placeholder')]]"
          selected="{{selectedRendition}}"
          attr-for-selected="name"
        >
          <template is="dom-repeat" items="[[_computeRenditionOptions(document, i18n)]]" as="rendition">
            <paper-item name$="[[rendition.id]]">[[rendition.label]]</paper-item>
          </template>
        </nuxeo-select>
        <template is="dom-if" if="[[!_isMultiple]]">
          <div class="versions">
            <label>[[i18n('documentInfo.version')]]</label>
            <nuxeo-document-versions id="version" document="[[document]]"></nuxeo-document-versions>
          </div>
        </template>
        <div class="options">
          <label>[[i18n('publication.internal.options')]]</label>
          <paper-checkbox id="override" checked="{{override}}">
            [[i18n('publication.internal.override')]]
          </paper-checkbox>
        </div>
      </div>
      <div class="buttons horizontal end-justified layout">
        <div class="flex start-justified">
          <paper-button noink dialog-dismiss on-tap="_cancel" class="secondary"
            >[[i18n('command.cancel')]]</paper-button
          >
        </div>
        <paper-button
          id="publish"
          noink
          class="primary"
          on-tap="_publish"
          disabled$="[[!_canPublish(document,publishSpace)]]"
        >
          [[i18n('publication.publish')]]
        </paper-button>
      </div>
    </div>
  `,

  is: 'nuxeo-internal-publish',
  behaviors: [SelectAllBehavior, NotifyBehavior, I18nBehavior, LayoutBehavior],

  properties: {
    /**
     * Input document.
     */
    document: Object,

    /**
     * Input documents.
     */
    documents: Array,

    publishSpace: Object,

    selectedRendition: {
      type: String,
      value: 'none',
    },

    _isMultiple: {
      type: Boolean,
      computed: '_computeMultiple(document, documents.length)',
    },

    targetFormatter: {
      type: Function,
      value() {
        return this._targetFormatter.bind(this);
      },
    },
  },

  _computeMultiple() {
    return !!(this.documents && this.documents.length > 0);
  },

  _computeRenditionOptions() {
    const options = [
      { id: 'none', label: this.i18n('publication.internal.renditon.none') },
      { id: 'default', label: this.i18n('publication.internal.renditon.default') },
    ];
    if (this.document && this.document.contextParameters && this.document.contextParameters.renditions) {
      this.document.contextParameters.renditions.forEach((item) => {
        options.push({ id: item.name, label: this.formatRendition(item.name), icon: item.icon });
      });
    }
    return options;
  },

  _onPollStart() {
    this.notify({
      message: this.i18n('publication.bulkOperation.poll.start'),
      abort: this._isSelectAllActive(),
      dismissible: this._isSelectAllActive(),
    });
    this.fire('nx-publish-success', { dismissible: true });
  },

  _onResponse() {
    this.fire('notify', {
      message: this.i18n(`publication.internal.publish.success${this._isMultiple ? '.multiple' : ''}`),
      dismissible: this._isSelectAllActive(),
    });
    if (this._isMultiple) {
      this.fire('navigate', { doc: this.publishSpace });
    } else {
      this.fire('document-updated');
    }
  },

  _input() {
    if (this._isSelectAllActive()) {
      return this.view;
    }
    return this._isMultiple ? `docs:${this.documents.map((doc) => doc.uid).join(',')}` : this.document.uid;
  },

  _operation() {
    return this._isSelectAllActive() ? 'Bulk.RunAction' : 'Document.PublishToSection';
  },

  _params() {
    const parameters = {
      target: this.publishSpace.uid,
      override: this.override,
    };
    if (this.selectedRendition === 'default') {
      parameters.defaultRendition = true;
    } else if (this.selectedRendition !== 'none') {
      parameters.renditionName = this.selectedRendition;
    }

    if (this._isSelectAllActive()) {
      return {
        operationId: 'Document.PublishToSection',
        parameters: parameters,
      };
    }
    return parameters;
  },

  _publish() {
    const opBtn = this.bulkOpBtn;
    opBtn.input = this._input();
    opBtn.operation = this._operation();
    opBtn.params = this._params();
    opBtn._execute();
  },

  _canPublish() {
    this.errorMessage = null;
    if (!this.publishSpace) {
      return false;
    }
    const hasPermission = this.hasPermission(this.publishSpace, 'AddChildren');
    if (!hasPermission) {
      this.errorMessage = this.i18n('publication.internal.location.error.noPermission');
    }
    return hasPermission;
  },

  _cancel() {
    this.fire('cancel');
  },

  _targetFormatter(doc) {
    return escapeHTML(doc.title);
  },
});
