/*
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import './nuxeo-template-param-editor.js';

/**
`nuxeo-template-rendering-page`
@group Nuxeo UI
@element nuxeo-template-rendering-page
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment nuxeo-styles">
      :host {
        @apply --layout-flex;
        display: block;
      }

      .buttons {
        @apply --buttons-bar;
        margin: 16px -16px -16px -16px;
      }
    </style>

    <nuxeo-document id="doc" doc-id="[[editedDocument.uid]]" data="{{editedDocument}}" response="{{document}}">
    </nuxeo-document>

    <nuxeo-card heading="[[i18n('templateRenderingPage.config.heading')]]">
      <iron-pages selected="[[configMode]]" attr-for-selected="name" class="vertical layout flex">
        <div name="view">
          <div hidden$="[[!document.properties.tmpl:applicableTypes]]">
            <label>[[i18n('templateRenderingPage.validDocTypes')]]</label>
            <nuxeo-selectivity
              data="[[docTypes]]"
              placeholder="[[i18n('templateRenderingPage.validDocTypes.placeholder')]]"
              value="{{document.properties.tmpl:applicableTypes}}"
              min-chars="0"
              multiple
              readonly
            ></nuxeo-selectivity>
          </div>

          <div>
            <label>[[i18n('templateRenderingPage.parametersOverride')]]</label>
            <template is="dom-if" if="[[document.properties.tmpl:allowOverride]]">
              <span>[[i18n('label.yes')]]</span>
            </template>
            <template is="dom-if" if="[[!document.properties.tmpl:allowOverride]]">
              <span>[[i18n('label.no')]]</span>
            </template>
          </div>

          <div hidden$="[[!document.properties.tmpl:templateType]]">
            <label>[[i18n('templateRenderingPage.processor.label')]]</label>
            <div>[[_getProcessorLabel(document.properties.tmpl:templateType)]]</div>
          </div>

          <div class="buttons">
            <div class="horizontal layout start-justified">
              <paper-button noink class="primary" on-tap="_editConfig">[[i18n('command.edit')]]</paper-button>
            </div>
          </div>
        </div>
        <div name="edit">
          <div class="vertical layout">
            <nuxeo-resource path="config/types/" on-response="_handleDocTypes" auto></nuxeo-resource>

            <label>[[i18n('templateRenderingPage.validDocTypes')]]</label>
            <nuxeo-selectivity
              data="[[docTypes]]"
              placeholder="[[i18n('templateRenderingPage.validDocTypes.placeholder')]]"
              value="{{editedDocument.properties.tmpl:applicableTypes}}"
              min-chars="0"
              multiple
            ></nuxeo-selectivity>
            <label>[[i18n('templateRenderingPage.parametersOverride')]]</label>
            <paper-checkbox checked="{{editedDocument.properties.tmpl:allowOverride}}"></paper-checkbox>

            <paper-dropdown-menu
              label="[[i18n('templateRenderingPage.processor.label')]]"
              horizontal-align="left"
              always-float-label
            >
              <paper-listbox
                slot="dropdown-content"
                selected="{{editedDocument.properties.tmpl:templateType}}"
                attr-for-selected="name"
              >
                <template is="dom-repeat" items="[[processors]]">
                  <paper-item name="[[item]]">[[_getProcessorLabel(item)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          <div class="buttons">
            <div class="horizontal layout start-justified">
              <paper-button noink dialog-dismiss on-tap="_cancelEditConfig" class="secondary"
                >[[i18n('command.cancel')]]</paper-button
              >
              <paper-button noink class="primary" on-tap="_saveEditConfig">[[i18n('command.save')]]</paper-button>
            </div>
          </div>
        </div>
      </iron-pages>
    </nuxeo-card>

    <nuxeo-card heading="[[i18n('templateRenderingPage.parameters.heading')]]">
      <div class="vertical layout">
        <nuxeo-template-param-editor
          id="paramEditor"
          template-data="[[_getTemplateData(editedDocument)]]"
          mode="[[paramsMode]]"
          allow-create
          allow-delete
        ></nuxeo-template-param-editor>
      </div>
      <div class="buttons">
        <div class="horizontal layout start-justified">
          <iron-pages selected="[[paramsMode]]" attr-for-selected="name" class="vertical layout flex">
            <div name="view">
              <paper-button noink class="primary" on-tap="_editParams">[[i18n('command.edit')]]</paper-button>
            </div>
            <div name="edit">
              <paper-button noink dialog-dismiss on-tap="_cancelEditParams" class="secondary"
                >[[i18n('command.cancel')]]</paper-button
              >
              <paper-button noink class="primary" on-tap="_saveEditParams">[[i18n('command.save')]]</paper-button>
            </div>
          </iron-pages>
        </div>
      </div>
    </nuxeo-card>
  `,

  is: 'nuxeo-template-rendering-page',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_documentChanged',
    },
    docTypes: Array,
    processors: {
      type: Array,
      value: ['auto', 'Freemarker', 'XSLTProcessor', 'Identity', 'JXLSProcessor', 'XDocReportProcessor'],
    },
    outputFormats: {
      type: Array,
      value: ['none', 'pdf', 'odt', 'doc', 'docx'],
    },
    editedDocument: Object,
    configMode: {
      type: String,
      value: 'view',
    },
    paramsMode: {
      type: String,
      value: 'view',
    },
    originalDocument: Object,
  },

  _getProcessorLabel(processor) {
    return this.i18n(`templateRenderingPage.processor.${processor}`);
  },

  _getOutputFormatLabel(format) {
    if (format === 'none') {
      return this.i18n(`templateRenderingPage.outputFormat.${format}`);
    }
    return format ? format.toUpperCase() : null;
  },

  _documentChanged() {
    if (this.document) {
      this.set('document.properties.tmpl:templateType', this.document.properties['tmpl:templateType'] || 'auto');
      this.set('editedDocument', this._parseJSON(this.document));
      if (this.originalDocument === undefined) this.originalDocument = this._parseJSON(this.document);
    }
  },

  _handleDocTypes(e) {
    const docTypes = [
      {
        id: 'all',
        text: this.i18n('templateRenderingPage.label.document.type.all'),
        displayLabel: this.i18n('templateRenderingPage.label.document.type.all'),
      },
    ];
    Object.keys(e.detail.response.doctypes)
      .sort()
      .forEach((docType) => {
        docTypes.push({
          id: docType,
          text: docType,
          displayLabel: docType,
        });
      });
    this.set('docTypes', docTypes);
  },

  _resetConfig() {
    this.set('editedDocument', this._parseJSON(this.document));
  },

  _findChangedValues(originalDocument, modifiedDocument) {
    return Object.fromEntries(
      Object.entries(modifiedDocument).filter(([key, val]) => {
        if (typeof originalDocument[key] === 'object') {
          return key in originalDocument && JSON.stringify(originalDocument[key]) !== JSON.stringify(val);
        }
        return key in originalDocument && originalDocument[key] !== val;
      }),
    );
  },

  _parseJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  _save() {
    const modified = this._parseJSON(this.editedDocument.properties);
    const originalDocument = this._parseJSON(this.originalDocument.properties);
    const changedvalue = this._findChangedValues(originalDocument, modified);

    this.editedDocument.properties = changedvalue;
    return this.$.doc.put().then(() => {
      this.originalDocument = this._parseJSON(this.editedDocument);
    });
  },

  _editConfig() {
    this.configMode = 'edit';
  },

  _cancelEditConfig() {
    this.configMode = 'view';
    this._resetConfig();
  },

  _saveEditConfig() {
    return this._save().then(() => {
      this.configMode = 'view';
    });
  },

  _editParams() {
    this.paramsMode = 'edit';
  },

  _cancelEditParams() {
    this.paramsMode = 'view';
    this._resetConfig();
    this.$.paramEditor.reset();
  },

  _saveEditParams() {
    this.$.paramEditor.commitChanges();
    this.set('editedDocument.properties.tmpl:templateData', this.$.paramEditor.generateTemplateData());
    return this._save().then(() => {
      this.paramsMode = 'view';
    });
  },

  _getTemplateData() {
    return this.editedDocument.properties['tmpl:templateData'];
  },
});
