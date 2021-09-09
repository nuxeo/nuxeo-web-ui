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
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import { pathFromUrl } from '@polymer/polymer/lib/utils/resolve-url.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { isPageProviderDisplayBehavior } from '../select-all-helpers.js';

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

      <nuxeo-dialog id="dialog" no-auto-focus with-backdrop modal>
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
        value: () => 'bulk/nuxeo-bulk-${layout}-layout.html',
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
      /**
       * A representation of the properties being edited.
       * It should closely resemble the `document` object present in the loaded bulk layout, except for a few details:
       * - Contains the full bound paths to the properties of the layout (`document.properties.[schema].[field]`),
       *   which is useful for obtaining the bulk widget wrapper instances to which they belong.
       * - When the layout is loaded, this gets populated with all the bound paths that can be obtained through
       *   introspection (different from `document`, which will only add paths as the fields are being edited).
       */
      _model: Object,
    };
  }

  static get observers() {
    return ['_loadLayout(documents.splices, layout, hrefFunction, hrefBase)'];
  }

  constructor() {
    super();
    this.icon = 'nuxeo:edit';
    this.label = this.i18n('documentEditBulkAction.tooltip');
    this.operation = 'Document.Update';
    // set up a listener to act on changes of the update modes of the bulk widget wrappers in the layout
    this.addEventListener('update-mode-changed', (e) => this._updateBulkWidget(e.detail.bulkWidget));
  }

  /**
   * Control the visibility of the button.
   */
  _isHidden() {
    // TODO compare to the _isHidden on nuxeo-add-to-collections-documents-button
    return !(isPageProviderDisplayBehavior(this.documents) || (this.documents && this.documents.length));
  }

  /**
   * Checks for the validity of the form, taking into account the specificities of the bulk widget wrappers.
   */
  _validate() {
    let valid = true;
    const layout = this.$$('nuxeo-layout');
    if (layout.element) {
      const elements = layout._getValidatableElements(layout.element.root);
      for (let el, i = 0; i < elements.length; i++) {
        el = elements[i];
        if (el.tagName.toLowerCase() === 'nuxeo-bulk-widget') {
          // validate the element as bulk widget
          // if the bulk widget is not tagged with a `boundPath`, it's safe to assume it has no value
          const value = el.boundPath ? this._model[el.boundPath] : null;
          // check if trying to replace with empty value
          const replacingWithEmptyValue = el.updateMode === 'replace' && this._isValueEmpty(value);
          if (replacingWithEmptyValue) {
            el._setError(this.i18n('bulkWidget.error.replaceWithEmpty'));
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
    if (layout.element && typeof layout.element.validate === 'function') {
      return layout.element.validate();
    }
    return true;
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
    let properties = '';
    // go through each of the bound paths that exist in the `_model`
    Object.keys(this._model).forEach((boundPath) => {
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
        let value = this._model[boundPath];
        // stringify if the value is considered an object (but not an Array)
        if (value instanceof Object && !Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        properties = `${properties}${path}=${value}\n`;
      } else if (bulkWidget.updateMode === 'remove') {
        properties = `${properties}${path}=\n`;
      }
    });
    this.input = this.documents;
    this.params = { properties };
    super._execute().finally(() => this.fire('refresh'));
    this.$.dialog.toggle();
    this._setSaving(false);
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

  _resetModel() {
    const layout = this.$$('nuxeo-layout');
    // initialize the model
    this._model = {};
    // reset properties object
    layout.element.document = {
      properties: {},
    };
    // fill in the model with the properties that we can already know that exist in the layout
    layout.element.__templateInfo.nodeInfoList
      .filter((node) => node.bindings)
      .forEach((node) => {
        node.bindings
          .filter((binding) => binding.kind === 'property')
          .forEach((binding) => {
            binding.parts
              .filter((part) => part.mode === '{' && part.source.startsWith('document.properties.'))
              .filter((part) => !this._model[part.source])
              .forEach((part) => {
                const sourceParts = part.source.split('.');
                sourceParts.pop();
                createNestedObject(layout.element, sourceParts);
                this._model[part.source] = null;
              });
          });
      });
  }

  /**
   * Resets everything and opens the bulk edit dialog.
   */
  _execute() {
    const bulkLayout = this.$$('nuxeo-layout').element;
    this._resetModel();
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
  _loadLayout(documents, layout, hrefFunction, hrefBase) {
    // force layout restamp
    this._set_href(null);
    const base =
      hrefBase ||
      // XXX Since this button is one level deeper than the directory of the layouts (`bulk/`), we need to remove this
      // part of the path to be able to locate them. Ideally we wouldn't need to do this manipulation.
      pathFromUrl(this.__dataHost.importPath || this.importPath).replace(/(nuxeo-document-bulk-actions\/)$/, '');
    const path = [base, hrefFunction(layout)].join(base.slice(-1) !== '/' ? '/' : '');
    this._set_href(path);
  }

  /**
   * Acts on changes of the `document.properties` of the loaded layout, updating bulk widget wrapper modes and messages.
   */
  _propertiesObserver(detail) {
    if (detail.path === 'document.properties') {
      // properties object was reset, do nothing
    } else if (detail.path.startsWith('document.properties')) {
      this._model[detail.path] = detail.value;
      const boundElement = this._getBoundElementFromPath(detail.path);
      const bulkWidget = this._getBulkWidget(boundElement);
      // tag the bulk widget with the path to be able trace the property value from bulk widget
      bulkWidget.boundPath = detail.path;
      // flip modes according to the value update
      if (['keep', 'remove'].includes(bulkWidget.updateMode) && !this._isValueEmpty(detail.value)) {
        // flip mode to replace if mode is keep/remove and value is not empty
        bulkWidget.updateMode = 'replace';
      } else if (bulkWidget.updateMode === 'replace' && this._isValueEmpty(detail.value)) {
        // flip mode to keep if mode is replace and value is empty
        bulkWidget.updateMode = 'keep';
      }
      this._updateBulkWidget(bulkWidget);
    }
  }

  /**
   * Handler executed when a new bulk edit layout is loaded.
   * - Resets the `_model`.
   * - Injects an observer to act on changes on the properties of the bulk edit layout.
   * - Injects the bulk widget wrappers for each widget.
   */
  _elementChanged() {
    const layout = this.$$('nuxeo-layout');
    if (!layout || !layout.element || !layout.element.shadowRoot) {
      return;
    }
    // initialize document if need be
    if (!layout.element.document) {
      layout.element.document = {
        properties: {},
      };
    }
    this._resetModel();
    // inject a properties observer callback function in the layout
    layout.element._propertiesObserver = this._propertiesObserver.bind(this);
    // set the observer in the layout so that when a property gets updated, the callback is executed
    layout.element._createMethodObserver('_propertiesObserver(document.properties.*)', true);
    // replace all the widgets in the layout with bulk widget wrappers
    // a widget is a node identified with the `role="widget"` attribute, it can be something as simple an input element
    // bound to a property, or a complex DOM structure with an element somewhere inside bound to a property
    const widgets = Array.from(layout.element.shadowRoot.querySelectorAll('[role="widget"], [role="table"]'));
    widgets.forEach((widget) => {
      const { parentNode } = widget;
      const bulkWidget = document.createElement('nuxeo-bulk-widget');
      parentNode.replaceChild(bulkWidget, widget);
      bulkWidget.appendChild(widget);
      // get the element that is bound to a property
      const boundElement = this._getBoundElement(widget, layout.element.__templateInfo);
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
  }

  /**
   * Gets the bulk widget that is structurally above the provided `node`, recursively.
   */
  _getBulkWidget(node) {
    if (!node.parentNode) {
      return null;
    }
    const parent = node.parentNode;
    return parent.tagName.toLowerCase() === 'nuxeo-bulk-widget' ? parent : this._getBulkWidget(parent);
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
    this.$$('nuxeo-layout').element.set(boundPath, null);
  }

  /**
   * Enables the provided `widget` for editing.
   */
  _enableWidget(widget) {
    if (!widget) {
      return;
    }
    if ('disabled' in widget) {
      widget.disabled = false;
    } else if ('readonly' in widget) {
      widget.readonly = false;
    } else if ('editable' in widget) {
      widget.editable = true;
    }
  }

  /**
   * Disables the provided `widget` for editing.
   */
  _disableWidget(widget) {
    if (!widget) {
      return;
    }
    if ('disabled' in widget) {
      widget.disabled = true;
    } else if ('readonly' in widget) {
      widget.readonly = true;
    } else if ('editable' in widget) {
      widget.editable = false;
    }
  }

  /**
   * Updates the provided `bulkWidget`'s value, message and editing status (enabled/disabled) according to its
   * `updateMode`. Then, updates the status of the save button.
   */
  _updateBulkWidget(bulkWidget) {
    if (bulkWidget.updateMode === 'keep') {
      this._clearValue(bulkWidget.boundPath);
      this._enableWidget(bulkWidget.element);
    } else if (bulkWidget.updateMode === 'remove') {
      this._clearValue(bulkWidget.boundPath);
      this._disableWidget(bulkWidget.element);
    } else if (bulkWidget.updateMode === 'replace') {
      this._enableWidget(bulkWidget.element);
    }
    // XXX edge case for boolean properties to clearly indicate the difference between `null` and `false` values
    if (bulkWidget.updateMode === 'replace' && bulkWidget.boundPath && this._model[bulkWidget.boundPath] === false) {
      bulkWidget._setWarning('This field will be unchecked (set as false) for all selected documents');
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
}
window.customElements.define(NuxeoEditDocumentsButton.is, NuxeoEditDocumentsButton);
