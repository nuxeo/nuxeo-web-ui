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
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import './nuxeo-template-param-editor.js';

/**
`nuxeo-render-template-button`
@group Nuxeo UI
@element nuxeo-render-template-button
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment nuxeo-action-button-styles">
      .container {
        padding: 1em 0 2em;
      }

      .buttons {
        @apply --buttons-bar;
      }

      label {
        @apply --nuxeo-label;
      }
    </style>

    <nuxeo-operation id="getTemplatesOp" op="[[filterOp]]"></nuxeo-operation>
    <nuxeo-operation id="renderTemplateOp" op="[[renderOp]]"></nuxeo-operation>
    <div id="render" class="action" on-tap="_toggleDialog">
      <paper-icon-button noink icon="[[icon]]" src="[[iconSrc]]" aria-labelledby="label"></paper-icon-button>
      <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n(label)]]</span>
      <paper-tooltip>[[i18n(tooltip)]]</paper-tooltip>
    </div>

    <nuxeo-dialog id="dialog" modal>
      <h2>[[i18n('renderTemplateButton.dialog.heading')]]</h2>
      <paper-dialog-scrollable>
        <div class="container layout vertical">
          <paper-dropdown-menu
            label="[[i18n('renderTemplateButton.dialog.instruction')]]"
            class="typeDropdown"
            noink
            always-float-label
            horizontal-align="left"
          >
            <paper-listbox slot="dropdown-content" selected="{{selectedTemplate}}" attr-for-selected="key">
              <template is="dom-repeat" items="[[_templates]]">
                <paper-item key="[[item]]">[[item.properties.dc:title]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
          <div hidden$="[[!selectedTemplate.properties.dc:description]]">
            <label>[[i18n('renderTemplateButton.dialog.template.description')]]</label>
            <div class="multiline">[[selectedTemplate.properties.dc:description]]</div>
          </div>
        </div>
      </paper-dialog-scrollable>
      <div class="buttons horizontal end-justified layout">
        <div class="flex start-justified">
          <paper-button noink dialog-dismiss class="secondary">[[i18n('command.cancel')]]</paper-button>
        </div>
        <paper-button noink class="primary" on-tap="_render">
          [[i18n('renderTemplateButton.dialog.render')]]
        </paper-button>
      </div>
    </nuxeo-dialog>

    <nuxeo-dialog id="editParamsDialog" modal>
      <h2>[[i18n('renderTemplateButton.editParamsDialog.heading', selectedTemplate.properties.dc:title)]]</h2>
      <paper-dialog-scrollable>
        <div class="container layout vertical">
          <nuxeo-template-param-editor
            id="paramEditor"
            template-data="[[_templateData]]"
            mode="edit"
          ></nuxeo-template-param-editor>
        </div>
      </paper-dialog-scrollable>
      <div class="buttons horizontal end-justified layout">
        <div class="flex start-justified">
          <paper-button noink dialog-dismiss class="secondary">[[i18n('command.cancel')]]</paper-button>
        </div>
        <paper-button noink on-tap="_reset">[[i18n('renderTemplateButton.editParamsDialog.reset')]]</paper-button>
        <paper-button noink class="primary" on-tap="_override">
          [[i18n('renderTemplateButton.editParamsDialog.render')]]
        </paper-button>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-render-template-button',
  behaviors: [NotifyBehavior, I18nBehavior],

  properties: {
    /**
     * The document to be rendered
     * */
    document: Object,
    /**
     * The operation/chain that will retrieve all the suitable templates for the document to be converted.
     *
     * This operation/chain must take as input a document and return a list of documents.
     * */
    filterOp: String,
    /**
     * The operation/chain that will be used to render the template.
     *
     * This operation/chain must take as input a document and retrieve a blob. As parameters it should take:
     *    templateName: the name of the template
     *    attach: true if the document should be automatically attached to the template if it's not already
     *    templateData: the templateData containing the parameters to be run
     * */
    renderOp: String,
    /**
     * `true` if the action should display the label, `false` otherwise.
     * */
    showLabel: {
      type: Boolean,
      value: false,
    },
    /**
     * The label to be displayed on menus.
     * */
    label: {
      type: String,
      value: 'renderTemplateButton.tooltip',
    },
    /**
     * The label for the tooltip.
     * */
    tooltip: {
      type: String,
      value: 'renderTemplateButton.tooltip',
    },
    /**
     * An icon from an iconset.
     * */
    icon: {
      type: String,
      value: 'icons:all-out',
    },
    /**
     * The URL for an icon image file. This will take precedence over a given icon attribute.
     * */
    iconSrc: String,
    /**
     * If set to true, the render popup won't be displayed if ony one template is available.
     * */
    skipRenderPopup: {
      type: Boolean,
      value: false,
    },

    _templates: {
      type: Array,
      value: [],
    },

    _templateData: String,
  },

  _toggleDialog() {
    this.set('_templates', []);
    this.set('selectedTemplate', '');
    this.$.getTemplatesOp.input = this.document;
    this.$.getTemplatesOp.execute().then((response) => {
      if (response.entries) {
        this.set('_templates', response.entries);
      }
      if (this._templates.length === 0) {
        this._toast(this.i18n('renderTemplateButton.toast.noTemplates'));
      } else {
        this.set('selectedTemplate', this._templates[0]);
        if (this.skipRenderPopup && this._templates.length === 1) {
          this._render();
        } else {
          this.$.dialog.toggle();
        }
      }
    });
  },

  _render() {
    this.set('_templateData', this.selectedTemplate.properties['tmpl:templateData']);
    if (this.selectedTemplate.properties['tmpl:allowOverride'] && this._templateData) {
      if (this.document.properties['nxts:bindings']) {
        let binding;
        for (let i = 0; i < this.document.properties['nxts:bindings'].length; i++) {
          const b = this.document.properties['nxts:bindings'][i];
          if (b.templateName === this.selectedTemplate.properties['tmpl:templateName']) {
            binding = b;
          }
        }
        if (binding) {
          this.set('_templateData', binding.templateData);
        }
        this.$.paramEditor.reset();
      }
      this.$.editParamsDialog.toggle();
    } else {
      this._renderOpWithParams();
    }
    if (this.$.dialog.opened) {
      this.$.dialog.toggle();
    }
  },

  _reset() {
    this.$.paramEditor.reset();
  },

  _override() {
    this.$.paramEditor.commitChanges();
    this.set('_templateData', this.$.paramEditor.generateTemplateData());
    this._renderOpWithParams();
    this.$.editParamsDialog.toggle();
  },

  _renderOpWithParams() {
    this.$.renderTemplateOp.input = this.document.uid;
    this.$.renderTemplateOp.params = {
      templateName: this.selectedTemplate.properties['tmpl:templateName'],
      attach: true,
      templateData: this._templateData,
    };
    this._toast(this.i18n('renderTemplateButton.toast.rendering'), 0);
    return this.$.renderTemplateOp
      .execute()
      .then((response) =>
        this._download(response).then(() => {
          this._toast(this.i18n('renderTemplateButton.toast.rendered', this.selectedTemplate.properties['dc:title']));
          if (this.selectedTemplate.properties['tmpl:allowOverride']) {
            this.fire('document-updated');
          }
        }),
      )
      .catch((response) => {
        this._toast(this.i18n('renderTemplateButton.toast.render.error', response.message));
      });
  },

  _toast(msg, duration) {
    this.notify({
      message: msg,
      close: true,
      duration,
    });
  },

  _download(response) {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatches = contentDisposition
        .match(/filename[^;=\n]*=([^;\n]*''([^;\n]*)|[^;\n]*)/)
        .filter((match) => !!match);
      const filename = decodeURI(filenameMatches[filenameMatches.length - 1]);
      return response.blob().then((blob) => {
        if (navigator.msSaveBlob) {
          // handle IE11 and Edge
          navigator.msSaveBlob(blob, filename);
        } else {
          const a = document.createElement('a');
          a.style = 'display: none';
          a.download = filename;
          a.href = URL.createObjectURL(blob);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }
      });
    }
    return Promise.reject(new Error('missing Content-Disposition header'));
  },
});
