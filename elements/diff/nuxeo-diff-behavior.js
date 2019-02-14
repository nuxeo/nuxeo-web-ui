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

function generateTextDiffHunks(text) {
  return text[0].split(/(@@[\s-+,\d]+@@)/).filter(Boolean).reduce(function(result, value, index, array) {
    if (index % 2 === 0) {
      var pair = array.slice(index, index + 2);
      var range = pair[0].match(/\d+,\d+/g);
      range = {
        original: range[0].split(',').map(Number),
        new: range[1].split(',').map(Number)
      }
      result.push({
        range: range,
        context: pair[1],
        hasAdditions: !!pair[1].match(/^\+(.*)$/gm),
        hasDeletions: !!pair[1].match(/^\-(.*)$/gm)
      });
    }
    return result;
  }, []);
}

/**
 * `Nuxeo.DiffBehavior` provides common behavior to elements that display differences between document properties.
 *
 * @polymerBehavior
 */
export const DiffBehavior = {
  properties: {
    /**
    * The property being represented
    */
    property: {
      type: String,
      reflectToAttribute: true
    },
    /**
    * The property's type.
    */
    type: {
      type: String,
      value: 'string',
      reflectToAttribute: true
    },
    /**
    * If `true`, the element is being used in single column mode.
    */
    unified: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    /**
    * If `true`, deletions will not be displayed.
    */
    hideDeletions: {
      type: Boolean,
      value: false
    },
    /**
    * If `true`, additions will not be displayed.
    */
    hideAdditions: {
      type: Boolean,
      value: false
    },
    /**
    * The label to be displayed.
    */
    label: {
      type: String
    },
    /**
    * The schema to which the property belongs to.
    */
    schema: Object,
    /**
     * The id of the document on the left, where deletions occurred.
     */
    leftUid: String,
    /**
     * The id of the document on the right, where additions occurred.
     */
    rightUid: String,
    /**
    * The difference delta.
    */
    delta: Object,
    /**
    * The original value.
    */
    originalValue: Object,
    /**
    * The new value.
    */
    newValue: Object,
    /**
    * If `true`, the element should display all information, including that not covered by `delta`.
    */
    showAll: {
      type: Boolean,
      value: false
    },
    /**
    * If `true`, the `label` will be displayed.
    */
    displayLabel: {
      type: Boolean,
      value: false
    },
    /**
    * If `true`, this element is part of an array. This is mostly used to condition styling.
    */
    isArrayItem: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    /**
    * The depth level, used to indent labels. Please override `_computeIndentStyle` to change indentation styling.
    */
    level: {
      type: Number,
      value: 0
    }
  },

  observers: ['_computeType(property, schema, delta, originalValue)'],

  _computeType: function(property, schema, delta, originalValue) {
    var type = this.type;
    if (property && schema && schema.fields && schema.fields[property]) {
      type = schema.fields[property];
      type = type.type || type;
    }
    // handle resolved types
    if (type === 'string' || type === 'string[]') {
      var aValue;
      // try to infer entity type from the original value
      if (this._isObject(originalValue) || (Array.isArray(originalValue) && originalValue.length > 0)) {
        aValue = Array.isArray(originalValue) ? originalValue[0] : originalValue;
      } else if (delta) {
        // no original value? let's try to find an entity type form the delta
        if (type === 'string[]') {
          var aKey = Object.keys(delta)[0];
          aValue = Array.isArray(delta[aKey]) ? delta[aKey][0] : delta[aKey];
        } else {
          aValue = Array.isArray(delta) ? delta[0] || delta[1] : delta;
        }
      }
      if (aValue && aValue['entity-type']) {
        type = aValue['entity-type'] + (type.endsWith('[]') ? '[]' : '');
      }
    }
    this.set('type', type);
  },

  _computeLabel: function(property, label) {
    return label || property;
  },

  _computeDefaultClass: function(delta, originalValue) {
    return this._isSimple(delta, originalValue) ? 'simple' : 'complex';
  },

  _computeArrayClass: function(delta, originalValue, newValue, hideAdditions, hideDeletions) {
    if (delta) {
      var arrdelta = this._getArrayDelta(delta, originalValue, newValue, hideAdditions, hideDeletions);
      return (arrdelta && arrdelta.length > 0) ?
        this._computeDefaultClass(arrdelta[0].value, arrdelta[0].originalValue) : 'simple';
    } else {
      return this._computeDefaultClass(undefined, originalValue);
    }
  },

  _showArrayItem: function(arrdelta, showAll) {
    return showAll || arrdelta.modified;
  },

  _incLevel: function(level) {
    return level + 1;
  },

  /**
  * Computes the indentation style for labels.
  */
  _computeIndentStyle: function(level, isArrayItem) {
    return 'margin-left: ' + (isArrayItem ? 0 : level * 12) + 'px;'
  },

  /* misc helpers */

  _isArray: function(value) {
    return Array.isArray(value);
  },

  _isObject: function(value) {
    return value && typeof value === 'object' && value.constructor === Object;
  },

  _isNotObjectNorArray: function(value) {
    return !this._isArray(value) && !this._isObject(value);
  },

  _getKeys: function(delta) {
    return Object.keys(delta);
  },

  _getValue: function(delta, property) {
    return delta && delta[property];
  },

  _getPropertySchema: function(schema, property) {
    return property ? (schema && schema.fields && schema.fields[property]) : schema;
  },

  _unwrapDelta: function(delta) {
    var value = delta;
    if (this._hasAddition(delta)) {
      value = this._getAddition(delta);
    } else if (this._hasDeletion(delta)) {
      value = this._getDeletion(delta);
    } else if (this._hasModification(delta)) {
      value = this._getModificationOldValue(delta) || this._getModificationNewValue(delta);
    } else if (this._hasTextDiff(delta)) {
      value = delta[0];
    } else if (this._hasArrayInnerChanges(delta)) {
      var aKey = Object.keys(delta).filter(function(key) {
        return key !== '_t';
      })[0];
      value = Array.isArray(delta[aKey]) ? delta[aKey][0] : delta[aKey];
    }
    return value;
  },

  _isSimpleDelta: function(delta) {
    return this._isNotObjectNorArray(this._unwrapDelta(delta));
  },

  _isSimple: function(delta, originalValue) {
    return delta ? this._isSimpleDelta(delta) :
      !this._isObject((Array.isArray(originalValue) && originalValue.length > 0) ? originalValue[0] : originalValue);
  },

  _getAllKeys: function(delta, originalValue, showAll) {
    return showAll ? this._getKeys(originalValue) : this._getKeys(delta);
  },

  _arrayItemType: function(type) {
    return type ? type.replace(/\[\]$/, '') : 'string';
  },

  /* delta helpers */

  _hasNoChanges: function(delta) {
    return !delta;
  },

  _hasAddition: function(delta, hideAdditions) {
    return !hideAdditions && Array.isArray(delta) && delta.length === 1;
  },

  _getAddition: function(delta) {
    return delta[0];
  },

  _hasModification: function(delta) {
    return Array.isArray(delta) && delta.length === 2;
  },

  _getModificationOldValue: function(delta) {
    return delta[0];
  },

  _getModificationNewValue: function(delta) {
    return delta[1];
  },

  _hasDeletion: function(delta, hideDeletions) {
    return !hideDeletions && Array.isArray(delta) && delta.length === 3 && delta[2] === 0;
  },

  _getDeletion: function(delta) {
    return delta[0];
  },

  _hasArrayMove: function(delta) {
    return Array.isArray(delta) && delta.length === 3 && delta[2] === 3;
  },

  _hasTextDiff: function(delta) {
    return Array.isArray(delta) && delta.length === 3 && delta[2] === 2;
  },

  _hasArrayInnerChanges: function(delta) {
    return this._isObject(delta) && delta._t === 'a';
  },

  _hasObjectInnerChanges: function(delta) {
    return this._isObject(delta) && !delta._t;
  },

  /* delta helpers: unidiff */

  _getTextDiff: function(text, originalValue, hideAdditions, hideDeletions) {
    if (!text || !originalValue) {
      return;
    }
    var hunks = generateTextDiffHunks(text);
    var result = '';
    var offset = 0;
    var start = 0;
    hunks.forEach(function(hunk){
      var end = hunk.range.original[0] - 1 + offset;
      result += originalValue.substring(start, end) + hunk.context
        .replace(/^\-(.*)$/gm, hideDeletions ? '' : '<span class="deleted">$1</span>') // removals
        .replace(/^\+(.*)$/gm, hideAdditions ? '' : '<span class="added">$1</span>') // deletions
        .replace(/^\s/gm, '') // modifier, which will by a black space for unmodified lines
        .replace(/(\r\n|\r|\n)/gm, ''); // new lines
      offset += hunk.range.original[1] - hunk.range.new[1];
      start += hunk.range.original[1] + (end - start);
    }.bind(this));
    return result;
  },

  /* delta helpers: arrays */

  _getArrayDelta: function(delta, originalValue, newValue, hideAdditions, hideDeletions) {
    if (!delta || !originalValue || !Array.isArray(originalValue)) {
      return;
    }
    var deltas = originalValue.map(function(val, index) {
      return { originalValue: val, modified: false, index: String(index), change: 'unchanged', newValue: null };
    });
    // sort and reversing assures that we'll deal first with deletions
    Object.keys(delta).filter(function(key) { return key !== '_t' }).sort().reverse().forEach(function(index) {
      var i;
      if (index.startsWith('_')) {
        i = Number(index.replace('_', ''));
        if (hideDeletions) {
          deltas.splice(i, 1);
        } else {
          deltas.splice(i, 1, {
            value: delta[index],
            modified: true,
            change: 'deleted',
            originalValue: originalValue[i],
            newValue: newValue ? newValue[i] : null,
            index: String(i)
          });
        }
      } else {
        i = Number(index);
        if (this._isObject(delta[index])) {
          deltas.splice(i, 1, {
            value: delta[index],
            modified: true,
            change: 'modified',
            originalValue: originalValue[i],
            newValue: newValue ? newValue[i] : null,
            index: String(i)
          });
        } else if (!hideAdditions) {
          deltas.splice(i, 0, {
            value: delta[index],
            modified: true,
            change: 'added',
            originalValue: originalValue[i],
            newValue: newValue ? newValue[i] : null,
            index: String(i)
          });
        }
      }
    }.bind(this));
    deltas.sort(function(a, b) {
      if (a.index === b.index) {
        if (a.change === b.change) {
          return 0;
        }
        return a.change === 'added' ? 1 : -1;
      } else {
        return a.index > b.index;
      }
    });
    return deltas;
  }
};
