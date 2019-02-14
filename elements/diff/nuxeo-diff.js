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
/**
`nuxeo-diff`
@group Nuxeo UI
@element nuxeo-diff
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
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
// import { diff } from 'jsondiffpatch/dist/jsondiffpatch.esm.js';

var _customLoadPromise;
var typeDataCache = {};
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
          <nuxeo-card heading="[[schema.name]]" collapsible="" opened="">
            <div class="deltaPane">
              <template is="dom-repeat" items="[[_getCommonSchemaProperties(schema, showAll, _delta)]]" as="property">
                <!-- unified view -->
                <template is="dom-if" if="[[unifiedView]]">
                  <nuxeo-object-diff property="[[_getPropertyName(schema, property)]]" label="[[_computeLabel(schema, property)]]" schema="[[schema]]" left-uid="[[leftUid]]" right-uid="[[rightUid]]" delta="[[_getPropertyDiff(_delta, property)]]" original-value="[[_getDocumentProperty(property, left)]]" new-value="[[_getDocumentProperty(property, right)]]" show-all="[[showAll]]" unified="" display-label=""></nuxeo-object-diff>
                </template>
                <!-- side-by-side view -->
                <template is="dom-if" if="[[!unifiedView]]">
                  <div class="side-by-side">
                    <nuxeo-object-diff property="[[_getPropertyName(schema, property)]]" label="[[_computeLabel(schema, property)]]" schema="[[schema]]" left-uid="[[leftUid]]" right-uid="[[rightUid]]" delta="[[_getPropertyDiff(_delta, property)]]" original-value="[[_getDocumentProperty(property, left)]]" new-value="[[_getDocumentProperty(property, right)]]" show-all="[[showAll]]" hide-additions="" display-label=""></nuxeo-object-diff>
                    <nuxeo-object-diff property="[[_getPropertyName(schema, property)]]" schema="[[schema]]" left-uid="[[leftUid]]" right-uid="[[rightUid]]" delta="[[_getPropertyDiff(_delta, property)]]" original-value="[[_getDocumentProperty(property, left)]]" new-value="[[_getDocumentProperty(property, right)]]" show-all="[[showAll]]" hide-deletions="" display-label=""></nuxeo-object-diff>
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
      value: []
    },
    /**
     * The list of documents in `docIds`, fetched using the `enrichers`, `schemas`and `headers` specified in the
     * element.
     */
    documents: {
      type: Array,
      value: [],
      readOnly: true
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
      readOnly: true
    },
    /**
     * List of content enrichers passed on to `provider`.
     * Already set by default are thumbnail, permissions and highlight.
     */
    enrichers: {
      type: String
    },
    /**
     * The headers passed on to `provider`.
     * Already set by default are 'X-NXfetch.document': 'properties' and 'X-NXtranslate.directoryEntry': 'label'.
     */
    headers: {
      type: String,
      value: {'X-NXfetch.document': 'properties', 'X-NXtranslate.directoryEntry': 'label'}
    },
    /**
     * The schemas passed on to `provider`.
     **/
    schemas: {
      type: String
    },
    /**
     * The id of the document on the left, where deletions occurred.
     */
    leftUid: {
      type: String,
      observer: 'leftUidChanged',
      notify: true
    },
    /**
     * The id of the document on the right, where additions occurred.
     */
    rightUid: {
      type: String,
      observer: 'rightUidChanged',
      notify: true
    },
    _unifiedView: {
      type: Boolean,
      value: false,
      observer: '_resize'
    },
    _showUnifiedViewControl: Boolean,
    _schemas: Array,
    left: {
      type: Object,
      notify: true
    },
    right:  {
      type: Object,
      notify: true
    },
    _delta: Object,
    _hasVersions: {
      type: Boolean,
      value: false
    }
  },

  observers: [
    '_docIdsChanged(docIds.*)'
  ],

  listeners: {
    'iron-resize': '_resize'
  },

  created: function() {
    if (!_customLoadPromise) {
      _customLoadPromise = new Promise(function(resolve, reject) {
        this.importHref(this.resolveUrl('imports.html'), resolve, reject);
      }.bind(this));
    }
  },

  _resize: function() {
    if (window.matchMedia('(max-width: 720px)').matches) {
      this._setUnifiedView(true);
      this._showUnifiedViewControl = false;
    } else {
      this._setUnifiedView(this._unifiedView);
      this._showUnifiedViewControl = true;
    }
  },

  _switchSides: function() {
    var right = this.rightUid;
    this.rightUid = this.leftUid;
    this.leftUid = right;
  },

  leftUidChanged: function(newValue, oldValue) {
    if (newValue === this.rightUid) {
      this.rightUid = oldValue;
    } else {
      this.diff();
    }
  },

  rightUidChanged: function(newValue, oldValue) {
    if (newValue === this.leftUid) {
      this.leftUid = oldValue;
    } else {
      this.diff();
    }
  },

  _computeLabel: function(schema, property) {
    var key = 'diffObject.property.label.' + property;
    var translation = this.i18n(key);
    return key !== translation ? translation : this._getPropertyName(schema, property);
  },

  _title: function(document) {
    return document && (document.title + (this._hasVersions && !document.isCheckedOut ?
      (' (v' + document.properties['uid:major_version'] + '.' + document.properties['uid:minor_version'] + ')')
      : ''));
  },

  /* DOM-repeat filters and sort functions */

  _filterUid: function(uid) {
    return function(document) {
      return document.uid != uid;
    }
  },

  _sortSchemas: function(schema1, schema2) {
    var schema1properties = this._getCommonProperties(this.left, this.right, schema1, this._delta);
    var schema2properties = this._getCommonProperties(this.left, this.right, schema2, this._delta);
    if ((schema1properties.length === 0 && schema1properties.length === schema2properties.length) ||
        (schema1properties.length > 0 && schema2properties.length > 0))  {
      return schema1.name > schema2.name;
    } else {
      return schema1properties.length < schema2properties.length;
    }
  },

  /* fetchers */

  _sequencer: function(promises) {
    return promises.reduce(function(current, next) {
      return current.then(next);
    }, Promise.resolve([]));
  },

  _docIdsChanged: function() {
    if (this.docIds && this.docIds.length > 1) {
      var calls = [];
      this._setDocuments([]);
      this.docIds.forEach(function(uid) {
        calls.push(function() {
          this.$.doc.docId = uid;
          return this.$.doc.get().then(function(response) {
            this.push('documents', response);
          }.bind(this));
        }.bind(this));
      }.bind(this));
      this._sequencer(calls).then(function() {
        this._hasVersions = this.documents.some(function(doc) {
          return doc.isVersion;
        });
        this.rightUid = null; // prevent accidental comparison with an old document
        this.leftUid = this.documents[0].uid;
        this.rightUid = this.documents[1].uid;
      }.bind(this));
    }
  },

  _fetchSchemas: function(document) {
    var type = document.type;
    if (typeDataCache[type]) {
      return Promise.resolve(typeDataCache[type]);
    }
    this.$.schema.path = 'config/types/' + type;
    return this.$.schema.get().then(function(response) {
      typeDataCache[response.name] = response; // cache response
      return response;
    });
  },

  _fetchCommonSchemas: function(left, right) {
    // if both have the same type, only do a single fetch
    if (left && right && left.type === right.type) {
      return this._fetchSchemas(left).then(function(response) {
        return response.schemas;
      });
    }
    return this._fetchSchemas(left).then(function(response1) {
      return this._fetchSchemas(right).then(function(response2) {
        return response1.schemas.filter(function(schema1) {
          return !!response2.schemas.find(function(schema2) {
            return schema1.name === schema2.name;
          });
        });
      });
    }.bind(this));
  },

  _getCommonProperties: function(left, right, schema, delta) {
    return Object.keys(left.properties).filter(function(leftPropName) {
      return !!Object.keys(right.properties).find(function(rightPropName) {
        return leftPropName === rightPropName &&
               (schema ? leftPropName.startsWith((schema.prefix ? schema.prefix : schema.name) + ':') : true) &&
               (delta ? delta[leftPropName] : true);
      });
    });
  },

  _getCommonSchemaProperties: function(schema, showAll, delta) {
    return this._getCommonProperties(this.left, this.right, schema, showAll ? null : delta);
  },

  _getCommonSchemas: function(schemas, showAll) {
    if (!schemas) {
      return;
    }
    return showAll ? schemas : schemas.filter(function(schema) {
      return this._getCommonProperties(this.left, this.right, schema, showAll ? null : this._delta).length > 0;
    }.bind(this));
  },

  /* comparison */

  _getPropertyDiff: function(delta, property) {
    return delta && delta[property];
  },

  _getDocumentProperty: function(property, document) {
    return document.properties[property];
  },

  _getPropertyName: function(schema, property) {
    if (!property || !schema) {
      return;
    }
    return property.replace(new RegExp('^' + (schema.prefix ? schema.prefix : schema.name) + ':'), '');
  },

  _diff: function() {
    if (!this.leftUid || !this.rightUid || this.leftUid === this.rightUid) {
      return;
    }
    var left = this.documents.find(function(doc) {
      return doc.uid === this.leftUid;
    }.bind(this));
    var right = this.documents.find(function(doc) {
      return doc.uid === this.rightUid;
    }.bind(this));
    this.left = left;
    this.right = right;
    this._fetchCommonSchemas(left, right).then(function(schemas) {
      this._schemas = schemas;
      var delta = diff(left.properties, right.properties);
      this._schemas.forEach(function(schema) {
        this._filterDelta(delta, schema);
      }.bind(this));
      this._delta = delta;
    }.bind(this));
  },

  diff: function() {
    _customLoadPromise.then(this._diff.bind(this));
  },

  _filterDelta: function(delta, schema, parentPath) {
    var path = parentPath || '';
    // if it's an array diff
    if (delta['_t'] && delta['_t'] == 'a') {
      Object.keys(delta).filter(function(key) {
        return key !== '_t';
      }).forEach(function(key) {
        var subpath = path ? [path, key].join('.') : properties[i];
        var deltaObj = (Array.isArray(delta[key]) && delta[key].length > 0) ? delta[key][0] : delta[key];
        this._filterDelta(deltaObj, schema, subpath);
        if (Object.keys(delta[key]).length === 0) {
          delete delta[key];
        }
      }.bind(this));
    } else {
      var deltaObj = (Array.isArray(delta) && delta.length > 0) ? delta[0] : delta;
      var properties = parentPath ? Object.keys(deltaObj) : this._getCommonSchemaProperties(schema, false, deltaObj);
      for (var i = 0; i < properties.length; i++) {
        var key = properties[i];
        var subpath = path ? [path, key].join('.') : properties[i];
        var type;
        var subSchema;
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
  }
});
