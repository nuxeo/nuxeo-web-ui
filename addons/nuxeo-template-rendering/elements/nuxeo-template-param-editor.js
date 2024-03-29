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
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';

const serializer = new XMLSerializer();
const parser = new DOMParser();

/**
`nuxeo-template-param-editor`
@group Nuxeo UI
@element nuxeo-template-param-editor
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: inline-block;
      }

      .container {
        padding: 1em 1.5em 2em 1.5em;
      }

      .buttons {
        @apply --buttons-bar;
        @apply --layout-horizontal;
        @apply --layout-end-justified;
      }

      #form {
        margin: 0;
        padding: 0;
      }

      #submitButton {
        display: none;
      }

      #editParamDialog paper-checkbox {
        margin-left: 8px;
      }

      /*
       * Not using mixin --paper-icon-button-disabled because: https://github.com/Polymer/polymer/issues/3205
       */
      paper-icon-button[disabled] {
        visibility: hidden;
      }

      .signature + .signature {
        margin-top: 6px;
        padding-top: 6px;
      }

      div[name='edit'] .signature + .signature,
      .signatureFooter {
        border-top: 1px solid var(--nuxeo-border);
      }

      .signature label {
        font-weight: bold;
      }

      .heading {
        font-size: 16px;
        color: var(--nuxeo-text-default);
        margin-top: 16px;
      }

      .deleted {
        color: var(--disabled-text-color);
      }

      .edited {
        font-weight: 900;
      }

      .horizontal-layout {
        @apply --layout-center;
        @apply --layout-horizontal;
        @apply --layout-flex;
      }

      .start-justified {
        @apply --layout-start-justified;
      }

      .justified {
        @apply --layout-justified;
      }

      .end-justified {
        @apply --layout-end-justified;
      }

      .vertical {
        @apply --layout-vertical;
      }

      .flex {
        @apply --layout-flex;
      }
    </style>

    <iron-pages selected="[[mode]]" attr-for-selected="name" class="vertical flex">
      <div name="view">
        <div class="horizontal-layout signature justified" hidden$="[[!_hasParams(params)]]">
          <div class="horizontal-layout start-justified">
            <label>[[i18n('templateRenderingPage.parameters.name')]]</label>
          </div>
          <div class="horizontal-layout start-justified">
            <label>[[i18n('templateRenderingPage.parameters.type')]]</label>
          </div>
          <div class="horizontal-layout start-justified">
            <label>[[i18n('templateRenderingPage.parameters.value')]]</label>
          </div>
        </div>
        <template is="dom-repeat" items="[[_getParams(params)]]" as="param">
          <div class="horizontal-layout signature justified">
            <div class="horizontal-layout start-justified">
              <span>[[_getParamAttribute(param, 'name', params)]]</span>
            </div>
            <div class="horizontal-layout start-justified">
              <span>[[_getParamTypeTranslated(param, params)]]</span>
            </div>
            <div class="horizontal-layout start-justified">
              <span>[[_getParamValueWithLoop(param, params)]]</span>
            </div>
          </div>
        </template>
      </div>
      <div name="edit">
        <div class="horizontal-layout signature start-justified">
          <div class="horizontal-layout start-justified">
            <label>[[i18n('templateRenderingPage.parameters.name')]]</label>
          </div>
          <div class="horizontal-layout start-justified">
            <label>[[i18n('templateRenderingPage.parameters.type')]]</label>
          </div>
          <div class="horizontal-layout start-justified">
            <label>[[i18n('templateRenderingPage.parameters.value')]]</label>
          </div>
          <div class="horizontal-layout start-justified"></div>
        </div>
        <template is="dom-repeat" items="[[_getParams(params)]]" as="param">
          <div class$="horizontal-layout signature justified [[_formatSignature(param, params)]]">
            <div class="horizontal-layout start-justified">
              <span>[[_getParamAttribute(param, 'name', params)]]</span>
            </div>
            <div class="horizontal-layout start-justified">
              <span>[[_getParamTypeTranslated(param, params)]]</span>
            </div>
            <div class="horizontal-layout start-justified">
              <span>[[_getParamValueWithLoop(param, params)]]</span>
            </div>
            <div class="horizontal-layout end-justified">
              <paper-icon-button
                id="[[_computeBtnId(param, 'edit')]]"
                icon="icons:create"
                on-tap="_editParam"
                disabled="[[!_canEdit(param, params)]]"
                aria-labelledby="editTooltip"
              ></paper-icon-button>
              <paper-tooltip for="[[_computeBtnId(param, 'edit')]]" id="editTooltip"
                >[[i18n('templateRenderingPage.parameters.edit.tooltip')]]</paper-tooltip
              >
              <div hidden$="[[!allowDelete]]">
                <paper-icon-button
                  id="[[_computeBtnId(param, 'remove')]]"
                  icon="icons:delete"
                  on-tap="_deleteParam"
                  disabled="[[!_canEdit(param, params)]]"
                  aria-labelledby="removeTooltip"
                ></paper-icon-button>
                <paper-tooltip for="[[_computeBtnId(param, 'remove')]]" id="removeTooltip"
                  >[[i18n('templateRenderingPage.parameters.remove.tooltip')]]</paper-tooltip
                >
              </div>
            </div>
          </div>
        </template>
        <div class="horizontal-layout end-justified signatureFooter" hidden$="[[!allowCreate]]">
          <paper-icon-button
            id="addParamBtn"
            icon="icons:add-circle"
            on-tap="_addParam"
            aria-labelledby="addParametersTooltip"
          ></paper-icon-button>
          <paper-tooltip for="addParamBtn" id="addParametersTooltip"
            >[[i18n('templateRenderingPage.parameters.add.tooltip')]]</paper-tooltip
          >
        </div>
      </div>
    </iron-pages>

    <nuxeo-dialog id="editParamDialog" modal>
      <iron-form id="form" on-iron-form-submit="_submitSaveParam">
        <form class="vertical flex">
          <div class="container vertical">
            <span class="heading">[[i18n('templateRenderingPage.editParamDialog.heading')]]</span>
            <paper-input
              label="[[i18n('templateRenderingPage.editParamDialog.paramName.label')]]"
              pattern="[[_computeParamNamePattern(param, params)]]"
              error-message="[[i18n('templateRenderingPage.editParamDialog.paramName.error')]]"
              value="{{selectedParamProperties.name}}"
              auto-validate
              always-float-label
              required
            ></paper-input>

            <paper-dropdown-menu label="[[i18n('templateRenderingPage.parameters.type')]]" always-float-label>
              <paper-listbox
                slot="dropdown-content"
                selected="{{selectedParamProperties.type}}"
                attr-for-selected="name"
              >
                <template is="dom-repeat" items="[[paramTypes]]">
                  <paper-item name="[[item]]">[[_getParamTypeLabel(item)]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>

            <template is="dom-if" if="[[_isSelectedParamType('String', selectedParamProperties.type)]]">
              <paper-textarea
                label="[[i18n('templateRenderingPage.parameters.value')]]"
                value="{{selectedParamProperties.value}}"
                always-float-label
              ></paper-textarea>
            </template>
            <template is="dom-if" if="[[_isSelectedParamType('Boolean', selectedParamProperties.type)]]">
              <div class="horizontal-layout">
                <label>[[i18n('templateRenderingPage.parameters.value')]]</label>
                <paper-checkbox checked="{{selectedParamProperties.value}}"></paper-checkbox>
              </div>
            </template>
            <template is="dom-if" if="[[_isSelectedParamType('Date', selectedParamProperties.type)]]">
              <div class="horizontal-layout">
                <nuxeo-date-picker
                  label="[[i18n('templateRenderingPage.parameters.value')]]"
                  value="{{selectedParamProperties.value}}"
                >
                </nuxeo-date-picker>
              </div>
            </template>
            <template is="dom-if" if="[[_isSelectedParamType('source', selectedParamProperties.type)]]">
              <div class="vertical">
                <paper-input
                  label="[[i18n('templateRenderingPage.parameters.xpath')]]"
                  value="{{selectedParamProperties.value}}"
                  always-float-label
                ></paper-input>
                <div class="horizontal-layout">
                  <label>[[i18n('templateRenderingPage.parameters.autoloop')]]</label>
                  <paper-checkbox checked="{{selectedParamProperties.loop}}"></paper-checkbox>
                </div>
              </div>
            </template>
            <template is="dom-if" if="[[_isSelectedParamType('picture', selectedParamProperties.type)]]">
              <div class="vertical">
                <paper-input
                  label="[[i18n('templateRenderingPage.parameters.xpath')]]"
                  value="{{selectedParamProperties.value}}"
                  always-float-label
                ></paper-input>
                <div class="horizontal-layout">
                  <label>[[i18n('templateRenderingPage.parameters.autoloop')]]</label>
                  <paper-checkbox checked="{{selectedParamProperties.loop}}"></paper-checkbox>
                </div>
              </div>
            </template>
            <template is="dom-if" if="[[_isSelectedParamType('content', selectedParamProperties.type)]]">
              <paper-dropdown-menu label="[[i18n('templateRenderingPage.parameters.source')]]" always-float-label>
                <paper-listbox
                  slot="dropdown-content"
                  selected="{{selectedParamProperties.contentType}}"
                  attr-for-selected="name"
                >
                  <template is="dom-repeat" items="[[contentTypes]]">
                    <paper-item name="[[item]]">[[_getContentTypeLabel(item)]]</paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
              <template is="dom-if" if="[[_isSelectedContentTypeXPath(selectedParamProperties.contentType)]]">
                <paper-input
                  label="[[i18n('templateRenderingPage.paramType.content.xpath')]]"
                  value="{{selectedParamProperties.value}}"
                  always-float-label
                ></paper-input>
              </template>
            </template>
          </div>
          <div class="buttons">
            <div class="flex start-justified">
              <paper-button noink dialog-dismiss on-tap="_cancel" class="secondary"
                >[[i18n('command.cancel')]]</paper-button
              >
            </div>
            <paper-button noink class="primary" on-tap="_save" disabled$="[[!_isValid(collection)]]">
              [[i18n('command.save')]]
            </paper-button>
          </div>
        </form>
      </iron-form>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-template-param-editor',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    templateData: {
      type: String,
      observer: '_readTemplateParams',
    },
    mode: {
      type: String,
      value: 'view',
    },
    params: Object,
    param: Object,
    paramTypes: {
      type: Array,
      value: ['String', 'Boolean', 'Date', 'source', 'picture', 'content'],
    },
    contentTypes: {
      type: Array,
      value: ['htmlPreview', 'blobContent', 'xpath'],
    },
    selectedParamProperties: {
      type: Object,
      value: {
        name: '',
        type: '',
        loop: '',
        value: '',
        contentType: '',
      },
    },
    allowDelete: {
      type: Boolean,
      value: false,
    },
    allowCreate: {
      type: Boolean,
      value: false,
    },
  },

  generateTemplateData() {
    return serializer.serializeToString(this.params.node);
  },

  reset() {
    this._readTemplateParams();
  },

  commitChanges() {
    this._getParams().forEach((param) => {
      const change = this._getParamAttribute(param, 'change');
      if (change) {
        if (change === 'deleted') {
          this.params.querySelector('templateParams').removeChild(param);
        }
        this._removeParamAttribute(param, 'change');
      }
    });
  },

  _templateDataChanged() {
    this._readTemplateParams();
  },

  _getParamTypeLabel(type) {
    return this.i18n(`templateRenderingPage.paramType.${type}`);
  },

  _getContentTypeLabel(type) {
    return this.i18n(`templateRenderingPage.paramType.content.${type}`);
  },

  _readTemplateParams() {
    this.set(
      'params',
      dom(
        parser.parseFromString(
          this.templateData
            ? this.templateData
            : '<nxdt:templateParams xmlns:nxdt="http://www.nuxeo.org/DocumentTemplate"/>',
          'text/xml',
        ),
      ),
    );
  },

  _getParams() {
    return this.params ? this.params.querySelectorAll('templateParams field') : [];
  },

  _hasParams() {
    return this._getParams().length > 0;
  },

  _getParamAttribute(param, attrname) {
    return param ? param.getAttribute(attrname) : '';
  },

  _setParamAttribute(param, attrname, attrvale) {
    param.setAttribute(attrname, attrvale);
  },

  _removeParamAttribute(param, attrname) {
    param.removeAttribute(attrname);
  },

  _checkParamAttribute(param, attrname, attrvalue) {
    return this._getParamAttribute(param, attrname) === attrvalue;
  },

  _getParamValue(param) {
    const type = this._getParamAttribute(param, 'type');
    switch (type) {
      case 'source':
      case 'picture':
      case 'content':
        return this._getParamAttribute(param, 'source');
      default:
        return this._getParamAttribute(param, 'value');
    }
  },

  _setParamValue(param, value) {
    const type = this._getParamAttribute(param, 'type');
    switch (type) {
      case 'source':
      case 'picture':
      case 'content':
        this._setParamAttribute(param, 'source', value);
        break;
      default:
        this._setParamAttribute(param, 'value', value);
        break;
    }
  },

  _getParamTypeTranslated(param) {
    return this._getParamTypeLabel(this._getParamAttribute(param, 'type'));
  },

  _getParamValueWithLoop(param) {
    const loop = this._getParamAttribute(param, 'autoloop');
    return this._getParamValue(param) + (loop ? ` (${this.i18n('templateRenderingPage.parameters.autoloop')})` : '');
  },

  _refreshParams() {
    // because this.params is a complex element, using this.set won't notify changes for sub-properties, which in
    // this case are inner elements. We need to override dirty checking:
    // https://www.polymer-project.org/1.0/docs/devguide/model-data#override-dirty-check
    const { params } = this;
    this.set('params', null);
    this.set('params', params);
  },

  _deleteParam(e) {
    this._setParamAttribute(e.model.param, 'change', 'deleted');
    this._refreshParams();
  },

  _loadEditParamDialog(param) {
    this.set('param', param);
    this.set('selectedParamProperties.name', this._getParamAttribute(this.param, 'name'));
    this.set('selectedParamProperties.type', this._getParamAttribute(this.param, 'type'));
    const loop = this._getParamAttribute(this.param, 'autoloop');
    this.set('selectedParamProperties.loop', !(!loop || loop === 'false'));
    let value = this._getParamValue(this.param);
    if (this.selectedParamProperties.type === 'Date') {
      value = this.formatDate(value, 'yyyy-MM-ddTHH:mm:ss');
    } else if (this.selectedParamProperties.type === 'Boolean') {
      value = !(!value || value === 'false');
    }
    if (this.selectedParamProperties.type === 'content') {
      if (value !== 'htmlPreview' && value !== 'blobContent') {
        this.set('selectedParamProperties.contentType', 'xpath');
      } else {
        this.set('selectedParamProperties.contentType', value);
        value = '';
      }
    } else {
      this.set('selectedParamProperties.contentType', 'htmlPreview');
    }
    this.set('selectedParamProperties.value', value);
  },

  _editParam(e) {
    this._loadEditParamDialog(e.model.param);
    this.$.editParamDialog.toggle();
  },

  _addParam() {
    this.new = true;
    this.param = document.createElementNS('http://www.nuxeo.org/DocumentTemplate', 'nxdt:field');
    this._setParamAttribute(this.param, 'name', '');
    this._setParamAttribute(this.param, 'type', 'String');
    this._setParamAttribute(this.param, 'value', '');
    this._loadEditParamDialog(this.param);
    this.$.editParamDialog.toggle();
  },

  _save() {
    this.$.form.submit();
  },

  _cancel() {
    this.new = false;
  },

  _submitSaveParam() {
    this._setParamAttribute(this.param, 'name', this.selectedParamProperties.name);
    this._setParamAttribute(this.param, 'type', this.selectedParamProperties.type);
    if (
      (this.selectedParamProperties.type === 'source' || this.selectedParamProperties.type === 'picture') &&
      this.selectedParamProperties.loop === true
    ) {
      this._setParamAttribute(this.param, 'autoloop', this.selectedParamProperties.loop);
    } else {
      this._removeParamAttribute(this.param, 'autoloop');
    }
    if (this.selectedParamProperties.type === 'Date') {
      this._setParamValue(this.param, this.formatDate(this.selectedParamProperties.value, 'yyyy-MM-dd HH:mm:ss.SSS'));
    } else if (
      this.selectedParamProperties.type === 'content' &&
      this.selectedParamProperties.contentType !== 'xpath'
    ) {
      this._setParamValue(this.param, this.selectedParamProperties.contentType);
    } else {
      this._setParamValue(this.param, this.selectedParamProperties.value);
    }
    if (this.new) {
      this.params.querySelector('templateParams').appendChild(this.param);
      this.new = false;
    }
    this._setParamAttribute(this.param, 'change', 'edited');
    this._refreshParams();
    this.$.editParamDialog.toggle();
  },

  _computeBtnId(param, action) {
    return `${action}_btn_${param.attributes.item('name').value}`;
  },

  _computeParamNamePattern() {
    const params = this._getParams();
    if (params && params.length > 0) {
      const fiteredParams = Array.from(this._getParams()).filter(
        (param) => this._getParamAttribute(param, 'name') !== this._getParamAttribute(this.param, 'name'),
      );
      if (fiteredParams.length > 0) {
        // return a pattern that prevents the name from being equal to the name of an already existing parameter
        // ex: /^((?!(^name1$|^name2$|^name3$)).)*$/g
        return `^((?!(${Array.from(this._getParams())
          .filter((param) => this._getParamAttribute(param, 'name') !== this._getParamAttribute(this.param, 'name'))
          .map((param) => `^${this._getParamAttribute(param, 'name')}$`)
          .join('|')})).)*$`;
      }
    }
    return '.*';
  },

  _isSelectedParamType(type) {
    return this.selectedParamProperties.type === type;
  },

  _isSelectedContentTypeXPath(selectedContentType) {
    return selectedContentType !== 'htmlPreview' && selectedContentType !== 'blobContent';
  },

  _formatSignature(param) {
    const change = this._getParamAttribute(param, 'change');
    return change || '';
  },

  _canEdit(param) {
    return this._getParamAttribute(param, 'change') !== 'deleted';
  },
});
