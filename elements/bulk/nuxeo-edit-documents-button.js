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
import '@polymer/iron-form/iron-form.js';
import '@polymer/paper-button/paper-button.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import { createNestedObject } from '@nuxeo/nuxeo-elements/utils.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import { pathFromUrl } from '@polymer/polymer/lib/utils/resolve-url.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { isPageProviderDisplayBehavior } from '../select-all-helpers.js';
import './nuxeo-bulk-widget.js';
import { _fetchSchemas } from '../fetch-schemas.js';

let schemas;

/**
`nuxeo-edit-documents-button`
@group Nuxeo UI
@element nuxeo-edit-documents-button
*/
class NuxeoEditDocumentsButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], Nuxeo.OperationButton) {
  static get is() {
    return 'nuxeo-edit-documents-button';
  }

  static get importMeta() {
    return import.meta;
  }

  static get template() {
    return html`
      <style include="nuxeo-action-button-styles nuxeo-styles">
        nuxeo-dialog {
          height: 100%;
          max-height: var(--nuxeo-document-form-popup-max-height, 60vh);
          min-width: var(--nuxeo-document-form-popup-min-width, 915px);
          margin: 0;
        }

        #form {
          margin: 0;
          padding: 0;
        }

        #form,
        form {
          @apply --layout-vertical;
          height: 100%;
        }

        .scrollable {
          margin-top: 24px;
          padding: 0 24px;
          @apply --layout-scroll;
          @apply --layout-flex;
          @apply --layout-vertical;
        }

        .actions {
          @apply --buttons-bar;
          @apply --layout-horizontal;
          @apply --layout-justified;
        }

        .saving-label {
          margin-right: 8px;
        }

        nuxeo-layout {
          margin-bottom: 24px;
        }
      </style>

      <!-- inherit nuxeo-operation-button template -->
      ${super.template}

      <nuxeo-resource id="schema"></nuxeo-resource>
      <nuxeo-dialog id="dialog" with-backdrop modal>
        <iron-form id="form">
          <form>
            <div class="scrollable">
              <nuxeo-layout href="[[_href]]" on-element-changed="_elementChanged"></nuxeo-layout>
            </div>
            <div class="actions">
              <paper-button noink class="secondary" dialog-dismiss>[[i18n('command.cancel')]]</paper-button>
              <paper-button
                id="save"
                on-tap="_save"
                noink
                class="primary"
                disabled$="[[saving]]"
                aria-label$="[[i18n('command.save')]]"
              >
                <template is="dom-if" if="[[!saving]]">
                  [[i18n('command.save')]]
                </template>
                <template is="dom-if" if="[[saving]]">
                  <span class="saving-label">[[i18n('command.save')]]</span>
                  <paper-spinner-lite active></paper-spinner-lite>
                </template>
              </paper-button>
            </div>
          </form>
        </iron-form>
      </nuxeo-dialog>
    `;
  }

  static get properties() {
    return {
      /**
       * The representation of the selected documents. Can be a list of documents or a view (for select all).
       */
      documents: {
        type: Array,
        notify: true,
        value: [],
      },
      /**
       * A flag that controls when the button is available or not.
       */
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        computed: '_isHidden(documents.splices)',
      },
      /**
       * The base url for the layout href.
       */
      hrefBase: {
        type: String,
        value: '',
      },
      /**
       * The function used to build the layout href, using `hrefTemplate` as the function body.
       */
      hrefFunction: {
        type: Function,
        computed: '_buildHrefFn(hrefTemplate)',
      },
      /**
       * The template to be used to build the layout href.
       */
      hrefTemplate: {
        type: String,
        // eslint-disable-next-line no-template-curly-in-string
        value: () => 'nuxeo-bulk-${layout}-layout.html',
      },
      /**
       * An id denoting the name of the layout to be stamped.
       */
      layout: {
        type: String,
        value: 'default',
        reflectToAttribute: true,
      },
      /**
       * A flag that specifies when the edited properties are being saved, ie. from the moment the user submits the form
       * until a response is received from the server.
       */
      saving: {
        type: Boolean,
        value: false,
        readOnly: true,
      },
      /**
       * The path of the layout to be loaded.
       */
      _href: {
        type: String,
        readOnly: true,
      },

      _fetchSchemas: {
        type: Function,
        value() {
          return () => _fetchSchemas(this.$.schema);
        },
      },
    };
  }

  static get observers() {
    return ['_loadLayout(layout, hrefFunction, hrefBase)'];
  }

  constructor() {
    super();
    this.icon = 'nuxeo:edit';
    this.label = this.i18n('documentEditBulkAction.tooltip');
    this.operation = 'Document.Update';
    // set up a listener to act on changes of the update modes of the bulk widget wrappers in the layout
    this.addEventListener('update-mode-changed', (e) => this._updateBulkWidget(e.detail.bulkWidget));
  }

  ready() {
    super.ready();
    this._fetchSchemas().then((response) => {
      schemas = response;
    });
  }

  /**
   * Control the visibility of the button.
   */
  _isHidden() {
    return !(isPageProviderDisplayBehavior(this.documents) || (this.documents && this.documents.length));
  }

  /**
   * Checks for the validity of the form, taking into account the specificities of the bulk widget wrappers.
   */
  _validate() {
    let valid = true;
    const layout = this.$$('nuxeo-layout');
    const bulkLayout = layout.element;
    if (bulkLayout) {
      const elements = layout._getValidatableElements(bulkLayout.root);
      for (let el, i = 0; i < elements.length; i++) {
        el = elements[i];
        if (el.tagName.toLowerCase() === 'nuxeo-bulk-widget') {
          // validate the element as bulk widget
          // if the bulk widget is not tagged with a `boundPath`, it's safe to assume it has no value
          const value = el.boundPath ? bulkLayout.get(el.boundPath) : null;
          // check if trying to replace with empty value
          const replacingWithEmptyValue =
            (el.updateMode === 'replace' || el.updateMode === 'addValues') && this._isValueEmpty(value);
          if (replacingWithEmptyValue) {
            el._setError(
              this.i18n(`bulkWidget.error.${el.updateMode === 'replace' ? 'replaceWithEmpty' : 'addValuesWithEmpty'}`),
            );
          }
          valid = valid && !replacingWithEmptyValue;
        } else {
          // validate the element as any other widget
          valid = valid && (el.validate ? el.validate() : el.checkValidity());
        }
      }
    }
    if (!valid) {
      return false;
    }
    if (bulkLayout && typeof bulkLayout.validate === 'function') {
      return bulkLayout.validate();
    }
    return true;
  }

  /**
   * Flattens the provided `data` structure (that can have multiple levels) into a single map-like structure, mapping
   * bound paths to values. Accepts a `currentPath` string to be added on all keys of the map. A `flattenedProperties`
   * parameter can also be passed so that the entries are added to it incrementally.
   */
  _flattenProperties(data, currentPath, flattenedProperties = {}) {
    const key = currentPath.split('.').pop();
    const [schemaId, fieldPath] = key.split(':');
    const currentSchema = this._findSchema(schemaId);
    // Due to blob's data structure, we don't want to flat it
    if (currentSchema && currentSchema.fields && currentSchema.fields[fieldPath] === 'blob') {
      flattenedProperties[currentPath] = data;
      return flattenedProperties;
    }

    Object.keys(data).forEach((k) => {
      const value = data[k];
      const propertyPath = currentPath ? `${currentPath}.${k}` : k;
      if (value instanceof Object && !Array.isArray(value)) {
        this._flattenProperties(value, propertyPath, flattenedProperties);
      } else {
        flattenedProperties[propertyPath] = value;
      }
    });
    return flattenedProperties;
  }

  /**
   * Validates and submits the form changes to the server.
   */
  _save() {
    this._setSaving(true);
    if (!this._validate()) {
      // validation failed, should not proceed
      this._setSaving(false);
      return;
    }
    const bulkLayout = this.$$('nuxeo-layout').element;
    const flattenedProperties = this._flattenProperties(bulkLayout.document.properties, 'document.properties');
    let properties = '';
    let propertiesBehaviors;
    // go through each of the property paths that exist in the document of the layout
    Object.keys(flattenedProperties).forEach((boundPath) => {
      // get the element bound to the property
      const boundElement = this._getBoundElementFromPath(boundPath);
      // get the bulk widget wrapper element
      const bulkWidget = this._getBulkWidget(boundElement);
      // get the path without the `document.properties.` part, replacing the `.` for `/` (complex fields)
      const path = boundPath
        .replace(/^(document\.properties\.)/, '')
        .split('.')
        .join('/');
      if (bulkWidget.updateMode === 'replace') {
        let value = bulkLayout.get(boundPath);
        if (this._shouldStringifyValue(value)) {
          value = JSON.stringify(value);
        }
        properties = `${properties}${path}=${value}\n`;
      } else if (bulkWidget.updateMode === 'addValues') {
        let value = bulkLayout.get(boundPath);
        if (this._shouldStringifyValue(value)) {
          value = JSON.stringify(value);
        }
        properties = `${properties}${path}=${value}\n`;
        propertiesBehaviors = `${properties}${path}=append_excluding_duplicates`;
      } else if (bulkWidget.updateMode === 'remove') {
        properties = `${properties}${path}=\n`;
      }
    });
    this.input = this.documents;
    this.params = { properties, propertiesBehaviors };
    super._execute().finally(() => this.fire('refresh'));
    this.$.dialog.toggle();
    this._setSaving(false);
  }

  /**
   * Returns a boolean value according to whether the provided property `value` should be stringified or not.
   */
  _shouldStringifyValue(value) {
    // check if value is an array
    if (Array.isArray(value)) {
      // should stringify the array if at least one of the entries is an object (then all should be objects)
      return value.some((entry) => entry instanceof Object);
    }
    // should stringify if value is an object
    return value instanceof Object;
  }

  /**
   * Checks if the given `value` is considered an empty value.
   */
  _isValueEmpty(value) {
    // is empty if value is undefined, null or empty string
    if ([undefined, null, ''].includes(value)) {
      return true;
    }
    // is empty if value is an empty array
    return Array.isArray(value) && value.length === 0;
  }

  /**
   * Resets all the properties of the layout.
   */
  _resetProperties() {
    const bulkLayout = this.$$('nuxeo-layout').element;
    // reset properties on the loaded layout
    bulkLayout.document = {
      properties: {},
    };
    // fill in the properties with what we can already know is bound in the layout
    bulkLayout.__templateInfo.nodeInfoList
      .filter((node) => node.bindings)
      .forEach((node) => {
        node.bindings
          .filter((binding) => binding.kind === 'property')
          .forEach((binding) => {
            binding.parts
              .filter((part) => part.mode === '{' && part.source.startsWith('document.properties.'))
              .forEach((part) => {
                const sourceParts = part.source.split('.');
                sourceParts.pop();
                // create the path for each bound property (necessary for complex properties)
                createNestedObject(bulkLayout, sourceParts);
                bulkLayout.set(part.source, null);
              });
          });
      });
  }

  /**
   * Resets everything and opens the bulk edit dialog.
   */
  _execute() {
    this._resetProperties();
    const bulkLayout = this.$$('nuxeo-layout').element;
    // reset the update mode on all bulk widgets
    Array.from(bulkLayout.shadowRoot.querySelectorAll('nuxeo-bulk-widget')).forEach((bulkWidget) => {
      bulkWidget.updateMode = 'keep';
    });
    this.$.dialog.toggle();
  }

  /**
   * The function used to build the layout href.
   */
  _buildHrefFn(tmpl) {
    return () => {
      const matches = tmpl.matchAll(/\${([^}]+)}/g);
      let str = tmpl;
      // eslint-disable-next-line no-restricted-syntax
      for (const [match, prop] of matches) {
        const val = prop.match(/^(layout)(\.(.+))?$/) ? this.get(prop).toLowerCase() : '';
        str = str.replace(match, val);
      }
      return str;
    };
  }

  /**
   * Loads the bulk edit layout.
   */
  _loadLayout(layout, hrefFunction, hrefBase) {
    const { href } = this.$$('nuxeo-layout');
    const base = hrefBase || pathFromUrl(this.__dataHost.importPath || this.importPath);
    const path = [base, hrefFunction(layout)].join(base.slice(-1) !== '/' ? '/' : '');
    if (href !== path) {
      // force layout restamp
      this._set_href(null);
      this._set_href(path);
    }
  }

  /**
   * Acts on changes of the `document.properties` of the loaded layout, updating bulk widget wrapper modes and messages.
   */
  _propertiesObserver(detail) {
    const bulkLayout = this.$$('nuxeo-layout').element;
    if (detail.path === 'document.properties') {
      // properties object was reset, do nothing
    } else if (detail.path.endsWith('.length') && Array.isArray(bulkLayout.get(detail.path.replace(/\.length$/, '')))) {
      // path ends in `.length` and the path without it matches an array property, do nothing
    } else if (detail.path.match(/\.\d+$/) && Array.isArray(bulkLayout.get(detail.path.replace(/\.\d+$/, '')))) {
      // path ends in `.[\d]` and the path without it matches an array property, do nothing
    } else if (detail.path.startsWith('document.properties')) {
      let boundPath = detail.path;
      // adjust bound path if it comes from a `splices` event
      if (boundPath.endsWith('.splices') && 'indexSplices' in detail.value) {
        boundPath = boundPath.replace(/\.splices$/, '');
      }
      const value = bulkLayout.get(boundPath);
      const boundElement = this._getBoundElementFromPath(boundPath);
      const bulkWidget = this._getBulkWidget(boundElement);
      // tag the bulk widget with the path to be able trace the property value from bulk widget
      bulkWidget.boundPath = boundPath;
      // if field is multivalued, enable it in the bulk-widget
      if (this._isArrayProperty(boundPath)) {
        bulkWidget._isMultivalued = true;
      }
      // flip modes according to the value update
      if (['keep', 'remove'].includes(bulkWidget.updateMode) && !this._isValueEmpty(value)) {
        // flip mode to replace if mode is keep/remove and value is not empty
        bulkWidget.updateMode = 'replace';
      } else if (bulkWidget.updateMode === 'replace' && this._isValueEmpty(value)) {
        // flip mode to keep if mode is replace and value is empty
        bulkWidget.updateMode = 'keep';
      }
      this._updateBulkWidget(bulkWidget);
    }
  }

  /**
   * Handler executed when a new bulk edit layout is loaded.
   * - Resets the `document` of the layout.
   * - Injects an observer to act on changes on the properties of the bulk edit layout.
   * - Injects the bulk widget wrappers for each widget.
   */
  _elementChanged() {
    const layout = this.$$('nuxeo-layout');
    if (layout && layout.element) {
      // the element's DOM might not be yet be initialized. If that is the case, we should wait for it.
      customElements.whenDefined(layout.element.is).then(() => {
        const bulkLayout = layout.element;
        // initialize document if need be
        if (!bulkLayout.document) {
          bulkLayout.document = {
            properties: {},
          };
        }
        // inject a properties observer callback function in the layout
        bulkLayout._propertiesObserver = this._propertiesObserver.bind(this);
        // set the observer in the layout so that when a property gets updated, the callback is executed
        bulkLayout._createMethodObserver('_propertiesObserver(document.properties.*)', true);
        // replace all the widgets in the layout with bulk widget wrappers
        // a widget is a node identified with the `role="widget"` attribute, it can be something as simple
        // an input element bound to a property, or a complex DOM structure with an element somewhere inside
        // bound to a property, example:
        // <div role="widget"> (<- widget)
        //   <label>Description</label>
        //   <nuxeo-input value="{{document.properties.dc:description}}"></nuxeo-input> (<- bound element)
        // </div>
        // XXX The data table selector is needed because it sets `role="table"` on itself (see ELEMENTS-1346)
        const selector = '[role="widget"], nuxeo-data-table[role="table"]';
        const widgets = Array.from(bulkLayout.shadowRoot.querySelectorAll(selector));
        widgets.forEach((widget) => {
          const { parentNode } = widget;
          const bulkWidget = document.createElement('nuxeo-bulk-widget');
          parentNode.replaceChild(bulkWidget, widget);
          bulkWidget.appendChild(widget);
          // get the element that is bound to a property
          const boundElement = this._getBoundElement(widget, bulkLayout.__templateInfo);
          // keep a reference of this element in the bulk widget
          bulkWidget.element = boundElement;
          // move the `role="widget"` to the bulk widget
          widget.removeAttribute('role');
          bulkWidget.setAttribute('role', 'widget');
          // move the `label` to the bulk widget
          if (boundElement.label) {
            bulkWidget.label = boundElement.label;
            boundElement.label = null;
          }
          // move the `required` to the bulk widget
          if (boundElement.required) {
            bulkWidget._required = true;
            boundElement.required = null;
          }
        });
      });
    }
  }

  /**
   * Gets the bulk widget that is structurally above the provided `node`, iteratively.
   */
  _getBulkWidget(node) {
    let current = node;
    while (current && current.tagName.toLowerCase() !== 'nuxeo-bulk-widget') {
      current = current.parentNode;
    }
    return current;
  }

  /**
   * Gets the element bound to a property that resides inside the provided `node` structure, recursively.
   */
  _getBoundElement(node, layoutTemplateInfo) {
    // if there's no boundNodes information yet, create it by finding all the nodes that have bindings
    if (!layoutTemplateInfo.boundNodes) {
      layoutTemplateInfo.boundNodes = [];
      for (let i = 0; i < layoutTemplateInfo.nodeList.length; i++) {
        if (layoutTemplateInfo.nodeInfoList[i].bindings) {
          layoutTemplateInfo.boundNodes.push(layoutTemplateInfo.nodeList[i]);
        }
      }
    }
    // if the widget itself is bound to a property, return it
    if (layoutTemplateInfo.boundNodes.includes(node)) {
      return node;
    }
    // keep searching recursively through the children (complex structure)
    return Array.from(node.children).find((child) => this._getBoundElement(child, layoutTemplateInfo));
  }

  /**
   * Returns whatever element is bound to the provided `boundPath`.
   */
  _getBoundElementFromPath(boundPath) {
    return this.$$('nuxeo-layout')._getBoundElements(boundPath)[boundPath];
  }

  /**
   * Clears the value of a property that is represented by the provided `boundPath`.
   */
  _clearValue(boundPath) {
    if (!boundPath) {
      return;
    }
    const bulkLayout = this.$$('nuxeo-layout').element;
    const value = bulkLayout.get(boundPath);
    if (Array.isArray(value)) {
      if (value.length !== 0 && this._isArrayProperty(boundPath)) {
        bulkLayout.set(boundPath, []);
      }
    } else {
      bulkLayout.set(boundPath, null);
    }
  }

  /**
   * Disables or enables the provided `widget` for editing.
   */
  _setWidgetDisabled(widget, value) {
    if (!widget) {
      return;
    }
    if ('disabled' in widget) {
      widget.disabled = !!value;
    } else if ('readonly' in widget) {
      widget.readonly = !!value;
    } else if ('editable' in widget) {
      widget.editable = !value;
    }
  }

  /**
   * Updates the provided `bulkWidget`'s value, message and editing status (enabled/disabled) according to its
   * `updateMode`. Then, updates the status of the save button.
   */
  _updateBulkWidget(bulkWidget) {
    if (bulkWidget.updateMode === 'keep') {
      this._clearValue(bulkWidget.boundPath);
      this._setWidgetDisabled(bulkWidget.element, false);
    } else if (bulkWidget.updateMode === 'remove') {
      this._clearValue(bulkWidget.boundPath);
      this._setWidgetDisabled(bulkWidget.element, true);
    } else if (bulkWidget.updateMode === 'replace' || bulkWidget.updateMode === 'addValues') {
      this._setWidgetDisabled(bulkWidget.element, false);
    }
    const bulkLayout = this.$$('nuxeo-layout').element;
    // XXX Edge case for boolean properties to clearly indicate the difference between `null` and `false` values
    if (bulkWidget.updateMode === 'replace' && bulkWidget.boundPath && bulkLayout.get(bulkWidget.boundPath) === false) {
      bulkWidget._setWarning(this.i18n('bulkWidget.warning.bool'));
    } else {
      bulkWidget._updateMessage();
    }
    this._updateSaveButton();
  }

  /**
   * Disables the save button if all the bulk widget wrappers in the layout are set to `keep` mode.
   */
  _updateSaveButton() {
    const bulkWidgets = Array.from(this.$$('nuxeo-layout').element.shadowRoot.querySelectorAll('nuxeo-bulk-widget'));
    this.$.save.disabled = bulkWidgets.every((bulkWidget) => bulkWidget.updateMode === 'keep');
  }

  _isArrayProperty(boundPath) {
    if (!boundPath) {
      return;
    }
    if (boundPath.startsWith('document.properties.')) {
      boundPath = boundPath.replace(/^(document\.properties\.)/, '');
    }
    const [schemaId, fieldPath] = boundPath.split(':');
    return this._isArrayPropertyPath(this._findSchema(schemaId), fieldPath);
  }

  _isArrayPropertyPath(model, fieldPath) {
    if (fieldPath.includes('.')) {
      const [fieldId, ...remainingPath] = fieldPath.split('.');
      return this._isArrayPropertyPath(model.fields[fieldId], remainingPath.join('.'));
    }
    const type = model.fields[fieldPath];
    // Complex fields will have nested types, so we need to check them
    return (type.type || type).endsWith('[]');
  }

  _findSchema(schemaId) {
    return schemas.find((schema) => schema['@prefix'] === schemaId);
  }
}
window.customElements.define(NuxeoEditDocumentsButton.is, NuxeoEditDocumentsButton);
