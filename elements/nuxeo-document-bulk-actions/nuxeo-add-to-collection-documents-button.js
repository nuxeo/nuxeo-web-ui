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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { escapeHTML } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-selectivity.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { isPageProviderDisplayBehavior } from '../select-all-helpers.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-textarea.js';

/**
`nuxeo-add-to-collection-documents-button`
@group Nuxeo UI
@element nuxeo-add-to-collection-documents-button
*/
class NuxeoAddToCollectionDocumentsButton extends mixinBehaviors(
  [I18nBehavior, FiltersBehavior],
  Nuxeo.OperationButton,
) {
  static get template() {
    return html`
      <style include="nuxeo-action-button-styles nuxeo-styles">
        :host([hidden]) {
          display: none;
        }

        /* Fix known stacking issue in iOS (NXP-24600)
           https://github.com/PolymerElements/paper-dialog-scrollable/issues/72 */
        paper-dialog-scrollable {
          --paper-dialog-scrollable: {
            -webkit-overflow-scrolling: auto;
          }
        }
      </style>

      <!-- inherit nuxeo-operation-button template -->
      ${super.template}

      <nuxeo-operation op="Collection.Create" id="createCollectionOp"></nuxeo-operation>

      <nuxeo-dialog id="dialog" with-backdrop>
        <h2>[[i18n('addToCollectionDocumentsButton.dialog.heading')]]</h2>
        <paper-dialog-scrollable>
          <nuxeo-selectivity
            id="nxSelect"
            label="[[i18n('addToCollectionDocumentsButton.dialog.collections')]]"
            operation="Collection.Suggestion"
            min-chars="0"
            placeholder="[[i18n('addToCollectionDocumentsButton.dialog.select')]]"
            value="{{collection}}"
            tagging="true"
            query-results-filter="[[resultsFilter]]"
            result-formatter="[[resultAndSelectionFormatter]]"
            selection-formatter="[[resultAndSelectionFormatter]]"
            new-entry-formatter="[[newEntryFormatter]]"
            required
          >
          </nuxeo-selectivity>
          <nuxeo-textarea
            label="[[i18n('addToCollectionDocumentsButton.dialog.description')]]"
            value="{{description::input}}"
            hidden$="[[!_isNew(collection)]]"
            always-float-label
          >
          </nuxeo-textarea>
        </paper-dialog-scrollable>

        <div class="buttons">
          <paper-button noink dialog-dismiss on-click="_resetPopup" class="secondary"
            >[[i18n('addToCollectionDocumentsButton.dialog.cancel')]]</paper-button
          >
          <paper-button name="add" noink class="primary" on-tap="add" disabled$="[[!_isValid(collection)]]">
            [[i18n('addToCollectionDocumentsButton.dialog.add')]]
          </paper-button>
        </div>
      </nuxeo-dialog>
    `;
  }

  static get is() {
    return 'nuxeo-add-to-collection-documents-button';
  }

  static get properties() {
    return {
      documents: {
        type: Array,
        notify: true,
        value: [],
      },

      collection: {
        type: String,
        value: '',
      },

      resultsFilter: {
        type: Function,
        value() {
          return this._resultsFilter.bind(this);
        },
      },

      resultAndSelectionFormatter: {
        type: Function,
        value() {
          return this._resultAndSelectionFormatter.bind(this);
        },
      },

      newEntryFormatter: {
        type: Function,
        value() {
          return this._newEntryFormatter.bind(this);
        },
      },

      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        computed: '_isHidden(documents.splices)',
      },
    };
  }

  constructor() {
    super();
    this.icon = 'nuxeo:collections';
    this.label = 'addToCollectionDocumentsButton.tooltip';
    this.operation = 'Document.AddToCollection';
  }

  _execute() {
    this.$.dialog.toggle();
  }

  _params() {
    return {
      collection: this.collection,
    };
  }

  /**
   * Control the visibility of the button.
   */
  _isHidden() {
    return !(
      isPageProviderDisplayBehavior(this.documents) ||
      (this.documents &&
        this.documents.length > 0 &&
        this.documents.every((doc) => !this.hasFacet(doc, 'NotCollectionMember')))
    );
  }

  _toggleDialog() {
    this.$.dialog.toggle();
  }

  add() {
    if (this._isNew()) {
      const op = this.$$('#createCollectionOp');
      const name = this.$.nxSelect.selectedItem.displayLabel;
      op.input = undefined;
      op.params = {
        name,
        description: this.description,
      };
      return op.execute().then((response) => {
        this.collection = response.uid;
        this._addToCollection();
      });
    }
    this._addToCollection();
  }

  _addToCollection() {
    const isSelectAllActive = isPageProviderDisplayBehavior(this.documents);
    let detail = {};
    if (!isSelectAllActive) {
      const uids = this.documents.map((doc) => doc.uid);
      detail = { docIds: uids, collectionId: this.collection };
    }

    this.input = this.documents;
    this.params = this._params();
    super._execute().then(() => {
      this.fire('added-to-collection', detail);
      if (!isSelectAllActive) {
        this._resetPopup();
        this._toggleDialog();
      }
    });
    // when select all is active we can immediately close the dialog and reset the popup
    if (isSelectAllActive) {
      this._resetPopup();
      this._toggleDialog();
    }
  }

  _resultsFilter(entry) {
    return entry.id && entry.id.indexOf('-999999') === -1;
  }

  _resultAndSelectionFormatter(item) {
    const label = item.displayLabel || item.title;
    // if we are adding a new entry with the _newEntryFormatter
    // we don't want to escape the HTML
    return item.id === -1 ? label : escapeHTML(label);
  }

  _newEntryFormatter(term) {
    return { id: -1, displayLabel: term };
  }

  _isValid() {
    return this.collection !== '';
  }

  _isNew() {
    return this.collection === -1;
  }

  _resetPopup() {
    this.set('collection', null);
    this.description = '';
  }
}

window.customElements.define(NuxeoAddToCollectionDocumentsButton.is, NuxeoAddToCollectionDocumentsButton);
