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

import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import './nuxeo-object-diff.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';
import * as jsondiffpatch from 'jsondiffpatch/dist/jsondiffpatch.esm.js';

let _customLoadPromise;
const typeDataCache = {};

/**
`nuxeo-diff`
@group Nuxeo UI
@element nuxeo-diff
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment nuxeo-styles">
      :host {
        display: block;
        --paper-input-container-underline: {
          display: none;
        };
      }

      nuxeo-object-diff[unified] ~ nuxeo-object-diff[unified],
      .side-by-side ~ .side-by-side {
        margin-top: 12px;
      }

      nuxeo-object-diff:not([unified]) {
        @apply --layout-vertical;
        @apply --layout-flex;
      }

      #controls {
        @apply --layout-horizontal;
        @apply --layout-end-justified;
        margin-bottom: 12px;
      }

      #diffContainer, #diffPane {
        @apply --layout-vertical;
      }

      #diffPickerPane {
        @apply --layout-horizontal;
      }

      .control ~ .control {
        margin-left: 8px;
      }

      .switchSides {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .switchSides paper-icon-button {
        margin: 0 4px 16px 4px;
      }

      .deltaPane {
        @apply --layout-vertical;
      }

      .side-by-side {
        @apply --layout-horizontal;
      }

      .side-by-side nuxeo-object-diff:not([unified]):not(:first-child) {
        margin-left: 16px;
      }

      .diffPickers {
        @apply --layout-horizontal;
        @apply --layout-flex;
        overflow: hidden;
      }

      .diffPicker {
        @apply --paper-card;
        @apply --layout-flex;
        overflow: hidden;
        padding: 4px 4px 4px 8px;
      }

      .diffPickers > .switchSides {
        display: flex;
      }

      #diffPickerPane > .switchSides {
        display: none;
      }

      @media (max-width: 720px) {
        .diffPickers {
          @apply --layout-vertical;
          @apply --layout-flex;
        }

        .diffPicker {
          @apply --layout-flex-none;
        }

        .diffPickers > .switchSides {
          display: none;
        }

        #diffPickerPane > .switchSides {
          display: flex;
        }

        .switchSides paper-icon-button {
          transform: rotate(90deg);
        }
      }
    </style>

    <nuxeo-resource id="schema"></nuxeo-resource>
    <nuxeo-document id="doc" headers="[[headers]]" enrichers="[[enrichers]]" schemas="[[schemas]]"></nuxeo-document>

    <div id="diffContainer">
      <div id="controls">
        <paper-checkbox class="control" checked="{{showAll}}">[[i18n('diff.controls.showAll')]]</paper-checkbox>
        <template is="dom-if" if="[[_showUnifiedViewControl]]">
          <paper-toggle-button class="control" checked="{{_unifiedView}}">[[i18n('diff.controls.unifiedView')]]</paper-toggle-button>
        </template>
      </div>
      <div id="diffPickerPane">
        <div class="diffPickers">
          <div class="diffPicker">
            <nuxeo-select selected="{{leftUid}}" attr-for-selected="uid">
              <template is="dom-repeat" items="[[documents]]">
                <paper-item uid="[[item.uid]]">[[_title(item, _hasVersions)]]</paper-item>
              </template>
            </nuxeo-select>
          </div>
          <div class="switchSides">
            <paper-icon-button id="switchSidesButtonH" icon="nuxeo:switch-sides" on-tap="_switchSides"></paper-icon-button>
            <nuxeo-tooltip for="switchSidesButtonH">[[i18n('diff.controls.switchSides.tooltip')]]</nuxeo-tooltip>
          </div>
          <div class="diffPicker">
            <nuxeo-select selected="{{rightUid}}" attr-for-selected="uid">
              <template is="dom-repeat" items="[[documents]]">
                <paper-item uid="[[item.uid]]">[[_title(item, _hasVersions)]]</paper-item>
              </template>
            </nuxeo-select>
          </div>
        </div>
        <div class="switchSides">
          <paper-icon-button id="switchSidesButtonV" icon="nuxeo:switch-sides" on-tap="_switchSides"></paper-icon-button>
          <nuxeo-tooltip for="switchSidesButtonV">[[i18n('diff.controls.switchSides.tooltip')]]</nuxeo-tooltip>
        </div>
      </div>
      <div id="diffPane">
        <template is="dom-repeat" items="[[_getCommonSchemas(_schemas, showAll, _delta)]]" as="schema" sort="_sortSchemas">
          <nuxeo-card heading="[[schema.name]]" collapsible opened>
            <div class="deltaPane">
              <template is="dom-repeat" items="[[_getCommonSchemaProperties(schema, showAll, _delta)]]" as="property">
                <!-- unified view -->
                <template is="dom-if" if="[[unifiedView]]">
                  <nuxeo-object-diff property="[[_getPropertyName(schema, property)]]" label="[[_computeLabel(schema, property)]]" schema="[[schema]]" left-uid="[[leftUid]]" right-uid="[[rightUid]]" delta="[[_getPropertyDiff(_delta, property)]]" original-value="[[_getDocumentProperty(property, left)]]" new-value="[[_getDocumentProperty(property, right)]]" show-all="[[showAll]]" unified display-label></nuxeo-object-diff>
                </template>
                <!-- side-by-side view -->
                <template is="dom-if" if="[[!unifiedView]]">
                  <div class="side-by-side">
                    <nuxeo-object-diff property="[[_getPropertyName(schema, property)]]" label="[[_computeLabel(schema, property)]]" schema="[[schema]]" left-uid="[[leftUid]]" right-uid="[[rightUid]]" delta="[[_getPropertyDiff(_delta, property)]]" original-value="[[_getDocumentProperty(property, left)]]" new-value="[[_getDocumentProperty(property, right)]]" show-all="[[showAll]]" hide-additions display-label></nuxeo-object-diff>
                    <nuxeo-object-diff property="[[_getPropertyName(schema, property)]]" label="[[_computeLabel(schema, property)]]" schema="[[schema]]" left-uid="[[leftUid]]" right-uid="[[rightUid]]" delta="[[_getPropertyDiff(_delta, property)]]" original-value="[[_getDocumentProperty(property, left)]]" new-value="[[_getDocumentProperty(property, right)]]" show-all="[[showAll]]" hide-deletions display-label></nuxeo-object-diff>
                  </div>
                </template>
              </template>
            </div>
          </nuxeo-card>
        </template>
      </div>
    </div>
`,

  is: 'nuxeo-diff',
  behaviors: [I18nBehavior, FiltersBehavior, IronResizableBehavior],

  properties: {
    /**
     * The list of ids of the documents to compare.
     */
    docIds: {
      type: Array,
      value: [],
    },
    /**
     * The list of documents in `docIds`, fetched using the `enrichers`, `schemas`and `headers` specified in the
     * element.
     */
    documents: {
      type: Array,
      value: [],
      readOnly: true,
    },
    /**
     * If `true`, the element will display all properties including those without any differences.
     */
    showAll: {
      type: Boolean,
      value: false,
    },
    /**
     *  If `true`, the element will display content in a single column.
     */
    unifiedView: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
      readOnly: true,
    },
    /**
     * List of content enrichers passed on to `provider`.
     * Already set by default are thumbnail, permissions and highlight.
     */
    enrichers: {
      type: String,
    },
    /**
     * The headers passed on to `provider`.
     * Already set by default are 'X-NXfetch.document': 'properties' and 'X-NXtranslate.directoryEntry': 'label'.
     */
    headers: {
      type: String,
      value: {'X-NXfetch.document': 'properties', 'X-NXtranslate.directoryEntry': 'label'},
    },
    /**
     * The schemas passed on to `provider`.
     * */
    schemas: {
      type: String,
    },
    /**
     * The id of the document on the left, where deletions occurred.
     */
    leftUid: {
      type: String,
      observer: 'leftUidChanged',
      notify: true,
    },
    /**
     * The id of the document on the right, where additions occurred.
     */
    rightUid: {
      type: String,
      observer: 'rightUidChanged',
      notify: true,
    },
    _unifiedView: {
      type: Boolean,
      value: false,
      observer: '_resize',
    },
    _showUnifiedViewControl: Boolean,
    _schemas: Array,
    left: {
      type: Object,
      notify: true,
    },
    right:  {
      type: Object,
      notify: true,
    },
    _delta: Object,
    _hasVersions: {
      type: Boolean,
      value: false,
    },
  },

  importMeta: import.meta,

  observers: [
    '_docIdsChanged(docIds.*)',
  ],

  listeners: {
    'iron-resize': '_resize',
  },

  created() {
    if (!_customLoadPromise) {
      _customLoadPromise = new Promise((resolve, reject) => {
        importHref(this.resolveUrl('imports.html'), resolve, reject);
      });
    }
  },

  _resize() {
    if (window.matchMedia('(max-width: 720px)').matches) {
      this._setUnifiedView(true);
      this._showUnifiedViewControl = false;
    } else {
      this._setUnifiedView(this._unifiedView);
      this._showUnifiedViewControl = true;
    }
  },

  _switchSides() {
    const right = this.rightUid;
    this.rightUid = this.leftUid;
    this.leftUid = right;
  },

  leftUidChanged(newValue, oldValue) {
    if (newValue === this.rightUid) {
      this.rightUid = oldValue;
    } else {
      this.diff();
    }
  },

  rightUidChanged(newValue, oldValue) {
    if (newValue === this.leftUid) {
      this.leftUid = oldValue;
    } else {
      this.diff();
    }
  },

  _computeLabel(schema, property) {
    const key = `diffObject.property.label.${  property}`;
    const translation = this.i18n(key);
    return key !== translation ? translation : this._getPropertyName(schema, property);
  },

  _title(document) {
    return document && (document.title + (this._hasVersions && !document.isCheckedOut ?
      (` (v${  document.properties['uid:major_version']  }.${  document.properties['uid:minor_version']  })`)
      : ''));
  },

  /* DOM-repeat filters and sort functions */

  _filterUid(uid) {
    return function(document) {
      return document.uid !== uid;
    }
  },

  _sortSchemas(schema1, schema2) {
    const schema1properties = this._getCommonProperties(this.left, this.right, schema1, this._delta);
    const schema2properties = this._getCommonProperties(this.left, this.right, schema2, this._delta);
    if ((schema1properties.length === 0 && schema1properties.length === schema2properties.length) ||
        (schema1properties.length > 0 && schema2properties.length > 0))  {
      return schema1.name > schema2.name;
    }
      return schema1properties.length < schema2properties.length;

  },

  /* fetchers */

  _sequencer(promises) {
    return promises.reduce((current, next) => current.then(next), Promise.resolve([]));
  },

  _docIdsChanged() {
    if (this.docIds && this.docIds.length > 1) {
      const calls = [];
      this._setDocuments([]);
      this.docIds.forEach((uid) => {
        calls.push(() => {
          this.$.doc.docId = uid;
          return this.$.doc.get().then((response) => {
            this.push('documents', response);
          });
        });
      });
      this._sequencer(calls).then(() => {
        this._hasVersions = this.documents.some((doc) => doc.isVersion);
        this.leftUid = null; // prevent accidental comparison with an old document
        this.leftUid = this.documents[1].uid;
        this.rightUid = this.documents[0].uid;
      });
    }
  },

  _fetchSchemas(document) {
    const {type} = document;
    if (typeDataCache[type]) {
      return Promise.resolve(typeDataCache[type]);
    }
    this.$.schema.path = `config/types/${  type}`;
    return this.$.schema.get().then((response) => {
      typeDataCache[response.name] = response; // cache response
      return response;
    });
  },

  _fetchCommonSchemas(left, right) {
    // if both have the same type, only do a single fetch
    if (left && right && left.type === right.type) {
      return this._fetchSchemas(left).then((response) => response.schemas);
    }
    return this._fetchSchemas(left).then((response1) => this._fetchSchemas(right).then((response2) => response1.schemas.filter((schema1) => !!response2.schemas.find((schema2) => schema1.name === schema2.name))));
  },

  _getCommonProperties(left, right, schema, delta) {
    return Object.keys(left.properties).filter((leftPropName) => !!Object.keys(right.properties).find((rightPropName) => leftPropName === rightPropName &&
               (schema ? leftPropName.startsWith(`${schema.prefix ? schema.prefix : schema.name  }:`) : true) &&
               (delta ? delta[leftPropName] : true)));
  },

  _getCommonSchemaProperties(schema, showAll, delta) {
    return this._getCommonProperties(this.left, this.right, schema, showAll ? null : delta);
  },

  _getCommonSchemas(schemas, showAll) {
    if (!schemas) {
      return;
    }
    return showAll ? schemas : schemas.filter((schema) => this._getCommonProperties(this.left, this.right, schema, showAll ? null : this._delta).length > 0);
  },

  /* comparison */

  _getPropertyDiff(delta, property) {
    return delta && delta[property];
  },

  _getDocumentProperty(property, document) {
    return document.properties[property];
  },

  _getPropertyName(schema, property) {
    if (!property || !schema) {
      return;
    }
    return property.replace(new RegExp(`^${  schema.prefix ? schema.prefix : schema.name  }:`), '');
  },

  _diff() {
    if (!this.leftUid || !this.rightUid || this.leftUid === this.rightUid) {
      return;
    }
    const left = this.documents.find((doc) => doc.uid === this.leftUid);
    const right = this.documents.find((doc) => doc.uid === this.rightUid);
    this.left = left;
    this.right = right;
    this._fetchCommonSchemas(left, right).then((schemas) => {
      this._schemas = schemas;
      const delta = jsondiffpatch.diff(left.properties, right.properties);
      this._schemas.forEach((schema) => {
        this._filterDelta(delta, schema);
      });
      this._delta = delta;
    });
  },

  diff() {
    _customLoadPromise.then(this._diff.bind(this));
  },

  _filterDelta(delta, schema, parentPath) {
    const path = parentPath || '';
    // if it's an array diff
    if (delta._t && delta._t === 'a') {
      Object.keys(delta).filter((key) => key !== '_t').forEach((key) => {
        const subpath = path ? [path, key].join('.') : key;
        const deltaObj = (Array.isArray(delta[key]) && delta[key].length > 0) ? delta[key][0] : delta[key];
        this._filterDelta(deltaObj, schema, subpath);
        if (Object.keys(delta[key]).length === 0) {
          delete delta[key];
        }
      });
    } else {
      const deltaObj = (Array.isArray(delta) && delta.length > 0) ? delta[0] : delta;
      const properties = parentPath ? Object.keys(deltaObj) : this._getCommonSchemaProperties(schema, false, deltaObj);
      for (let i = 0; i < properties.length; i++) {
        const key = properties[i];
        const subpath = path ? [path, key].join('.') : properties[i];
        let type;
        let subSchema;
        if (typeof schema === 'string') {
          type = schema.replace(/\[\]$/, '');
        } else {
          subSchema = schema.fields[this._getPropertyName(schema, key)];
          type = subSchema.type || subSchema;
        }
        switch (type) {
          case 'string':
          case 'date':
          case 'long':
          case 'integer':
          case 'boolean':
          case 'double':
            break;
          case 'blob':
            if (deltaObj[key] && !deltaObj[key].digest) {
              delete deltaObj[key];
            }
            break;
          default:
            if (deltaObj) {
              this._filterDelta(deltaObj[key], subSchema, subpath, schema);
            }
            break;
        }
      }
    }
  },
});
