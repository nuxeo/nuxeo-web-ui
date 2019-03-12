<!--
(C) Copyright 2017 Nuxeo (http://nuxeo.com/) and contributors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<link rel="import" href="nuxeo-template-param-editor.html">

<!--
`nuxeo-template-rendering-page`
@group Nuxeo UI
@element nuxeo-template-rendering-page
-->
<dom-module id="nuxeo-template-rendering-page">
  <template>
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

    <nuxeo-document id="doc" doc-id="[[editedDocument.uid]]"
                    data="{{editedDocument}}" response="{{document}}">
    </nuxeo-document>

    <nuxeo-card heading="[[i18n('templateRenderingPage.config.heading')]]">
      <iron-pages selected="[[configMode]]" attr-for-selected="name" class="vertical layout flex">
        <div name="view">

          <div hidden$="[[!document.properties.tmpl:applicableTypes]]">
            <label>[[i18n('templateRenderingPage.validDocTypes')]]</label>
            <nuxeo-selectivity data="[[docTypes]]"
                               placeholder="[[i18n('templateRenderingPage.validDocTypes.placeholder')]]"
                               value="{{document.properties.tmpl:applicableTypes}}"
                               min-chars=0 multiple readonly></nuxeo-selectivity>
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
              <paper-button noink class="primary" on-tap='_editConfig'>[[i18n('command.edit')]]</paper-button>
            </div>
          </div>
        </div>
        <div name="edit">
          <div class="vertical layout">
            <nuxeo-resource path="config/types/" on-response="_handleDocTypes" auto></nuxeo-resource>

            <label>[[i18n('templateRenderingPage.validDocTypes')]]</label>
            <nuxeo-selectivity data="[[docTypes]]"
                               placeholder="[[i18n('templateRenderingPage.validDocTypes.placeholder')]]"
                               value="{{editedDocument.properties.tmpl:applicableTypes}}"
                               min-chars=0 multiple></nuxeo-selectivity>
            <label>[[i18n('templateRenderingPage.parametersOverride')]]</label>
            <paper-checkbox checked="{{editedDocument.properties.tmpl:allowOverride}}"></paper-checkbox>

            <paper-dropdown-menu label="[[i18n('templateRenderingPage.processor.label')]]"
                                 horizontal-align="left"
                                 always-float-label>
              <paper-listbox slot="dropdown-content" selected="{{editedDocument.properties.tmpl:templateType}}" attr-for-selected="name">
                <template is="dom-repeat" items="[[processors]]">
                  <paper-item name="[[item]]">[[_getProcessorLabel(item)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          <div class="buttons">
            <div class="horizontal layout start-justified">
              <paper-button noink dialog-dismiss on-tap='_cancelEditConfig'>[[i18n('command.cancel')]]</paper-button>
              <paper-button noink class="primary" on-tap='_saveEditConfig'>[[i18n('command.save')]]</paper-button>
            </div>
          </div>
        </div>
      </iron-pages>
    </nuxeo-card>

    <nuxeo-card heading="[[i18n('templateRenderingPage.parameters.heading')]]">
      <div class="vertical layout">
        <nuxeo-template-param-editor id="paramEditor"
                                     template-data="[[_getTemplateData(editedDocument)]]"
                                     mode="[[paramsMode]]" allow-create allow-delete></nuxeo-template-param-editor>
      </div>
      <div class="buttons">
        <div class="horizontal layout start-justified">
          <iron-pages selected="[[paramsMode]]" attr-for-selected="name" class="vertical layout flex">
            <div name="view">
              <paper-button noink class="primary" on-tap='_editParams'>[[i18n('command.edit')]]</paper-button>
            </div>
            <div name="edit">
              <paper-button noink dialog-dismiss on-tap='_cancelEditParams'>[[i18n('command.cancel')]]</paper-button>
              <paper-button noink class="primary" on-tap='_saveEditParams'>[[i18n('command.save')]]</paper-button>
            </div>
          </iron-pages>
        </div>
      </div>
    </nuxeo-card>

  </template>
  <script>
    Polymer({
      is: 'nuxeo-template-rendering-page',
      behaviors: [Nuxeo.I18nBehavior, Nuxeo.FormatBehavior],
      properties: {
        document: {
          type: Object,
          observer: '_documentChanged'
        },
        docTypes: Array,
        processors: {
          type: Array,
          value: ['auto', 'Freemarker', 'XSLTProcessor', 'Identity', 'JXLSProcessor', 'XDocReportProcessor']
        },
        outputFormats: {
          type: Array,
          value: ['none', 'pdf', 'odt', 'doc', 'docx']
        },
        editedDocument: Object,
        configMode: {
          type: String,
          value: 'view'
        },
        paramsMode: {
          type: String,
          value: 'view'
        }
      },

      _getProcessorLabel: function(processor) {
        return this.i18n('templateRenderingPage.processor.' + processor);
      },

      _getOutputFormatLabel: function(format) {
        if (format === 'none') {
          return this.i18n('templateRenderingPage.outputFormat.' + format);
        } else {
          return format ? format.toUpperCase() : null;
        }
      },

      _documentChanged: function() {
        if (this.document) {
          this.set('document.properties.tmpl:templateType', this.document.properties['tmpl:templateType'] || 'auto');
          this.set('editedDocument' , JSON.parse(JSON.stringify(this.document)));
        }
      },

      _handleDocTypes: function(e) {
        var docTypes = [{
          id: 'all',
          text: this.i18n('templateRenderingPage.label.document.type.all'),
          displayLabel: this.i18n('templateRenderingPage.label.document.type.all')
        }];
        Object.keys(e.detail.response.doctypes).sort().forEach(function(docType) {
          docTypes.push({
            id: docType,
            text: docType,
            displayLabel: docType
          });
        });
        this.set('docTypes', docTypes);
      },

      _resetConfig: function() {
        this.set('editedDocument', JSON.parse(JSON.stringify(this.document)));
      },

      _save: function() {
        delete this.editedDocument.properties['dc:contributors'];
        return this.$.doc.put();
      },

      _editConfig: function() {
        this.configMode = 'edit';
      },

      _cancelEditConfig: function() {
        this.configMode = 'view';
        this._resetConfig();
      },

      _saveEditConfig: function() {
        return this._save().then(function() {
          this.configMode = 'view';
        }.bind(this));
      },

      _editParams: function() {
        this.paramsMode = 'edit';
      },

      _cancelEditParams: function() {
        this.paramsMode = 'view';
        this._resetConfig();
        this.$.paramEditor.reset();
      },

      _saveEditParams: function() {
        this.$.paramEditor.commitChanges();
        this.set('editedDocument.properties.tmpl:templateData', this.$.paramEditor.generateTemplateData());
        return this._save().then(function() {
          this.paramsMode = 'view';
        }.bind(this));
      },

      _getTemplateData: function() {
        return this.editedDocument.properties['tmpl:templateData'];
      }

    });
  </script>

</dom-module>
