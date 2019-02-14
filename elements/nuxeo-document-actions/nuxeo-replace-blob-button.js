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
`nuxeo-replace-blob-button`
@group Nuxeo UI
@element nuxeo-replace-blob-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '../nuxeo-dropzone/nuxeo-dropzone.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles nuxeo-styles">
      #dropzone {
        display: block;
      }
    </style>

    <nuxeo-document id="doc" doc-id="[[document.uid]]" response="{{document}}" sync-indexing=""></nuxeo-document>

    <dom-if if="[[_isAvailable(document)]]">
      <template>
        <div class="action" on-tap="_toggleDialog">
          <paper-icon-button id="replaceBtn" icon="[[icon]]" noink=""></paper-icon-button>
          <span class="label" hidden\$="[[!showLabel]]">[[_label]]</span>
        </div>
        <nuxeo-tooltip for="replaceBtn">[[_label]]</nuxeo-tooltip>
      </template>
    </dom-if>

    <nuxeo-dialog id="dialog" with-backdrop="">
      <h2>[[i18n('replaceBlobButton.dialog.heading')]]</h2>
      <nuxeo-dropzone id="dropzone" document="{{document}}" xpath="[[xpath]]" has-files="{{_canSubmit}}"></nuxeo-dropzone>
      <div class="buttons">
        <paper-button dialog-dismiss="" on-tap="_cancel">[[i18n('replaceBlobButton.dialog.cancel')]]</paper-button>
        <paper-button noink="" class="primary" dialog-confirm="" on-tap="_replaceBlob" disabled="[[!_canSubmit]]">[[i18n('replaceBlobButton.dialog.replace')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  /**
   * A button element for replacing a file blob from a document.
   *
   * Example:
   *
   *     <nuxeo-replace-blob-button document="[[document]]"></nuxeo-replace-blob-button>
   *
   * @appliesMixin Nuxeo.I18nBehavior
   * @appliesMixin Nuxeo.FiltersBehavior
   * @memberof Nuxeo
   */
  is: 'nuxeo-replace-blob-button',

  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Input document.
     */
    document: Object,

    /**
     * Path of the file object to delete.
     * For example `xpath="files:files/0/file"`.
     */
    xpath: {
      type: String,
      value: 'file:content',
    },

    /**
     * Icon to use (iconset_name:icon_name).
     */
    icon: {
      type: String,
      value: 'nuxeo:replace',
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    _canSubmit: {
      type: Boolean,
      value: false,
    },

    _label: {
      type: String,
      computed: '_computeLabel(i18n)',
    }
  },

  _cancel: function() {
    this.$.dropzone._deleteFile();
  },

  /**
   * Recursive method to create nested objects when they don't exist in a parent object.
   * It does not change any other existing objects or inner objects, only the ones referred in 'path'.
   * @param obj Parent Object where inner nested objects should be created.
   * @param path Array containing the inner object keys.
   * Usage Example:
   *
   *  - Creating document properties using xpath:
   *
   *    const xpath = 'my:custom/field/subfield/x'
   *    _createNestedObjectRecursive(this.document.properties, xpath.split('/'));
   *
   */
  _createNestedObjectRecursive: function(obj, path) {
    if (path.length === 0) {
      return;
    }
    if ((!Object.prototype.hasOwnProperty.call(obj, path[0]) && !obj[path[0]]) || typeof obj[path[0]] !== 'object') {
      obj[path[0]] = {};
    }
    return this._createNestedObjectRecursive(obj[path[0]], path.slice(1));
  },

  /**
   * Method to find which is the root property that should be sent to be updated in order to minimize the
   * possible issues due to concurrent changes, trying to avoid to change all the properties for a specific document.
   * Since there is still no way to update a specific array element, this method will assume that an array will
   * always be a root element.
   * @param pieces Array containing the inner object keys.
   * @param properties Document properties object.
   */
  _getRootProperty: function(pieces, properties) {
    var path = '';
    while(pieces.length > 0) {
      path += (path === '' ? '' : '.' ) + pieces.shift();
      if(Array.isArray(this.get(path, properties))) {
        return path;
      }
    }
    return path;
  },

  _replaceBlob: function() {
    // When xpath contains sub properties is important to check which is the root property.
    var rootProperty = this.xpath.includes('/')
      ? this._getRootProperty(this.xpath.split('/'), this.document.properties)
      : this.xpath;
    var dirtyProperties = {};
    this._createNestedObjectRecursive(dirtyProperties, rootProperty.split('.'));
    this.set(rootProperty, this.get(rootProperty, this.document.properties), dirtyProperties);

    this.$.doc.data = {
      'entity-type': 'document',
      uid: this.document.uid,
      properties: dirtyProperties
    };
    this.$.doc.put().then(function() {
      this.fire('document-updated');
    }.bind(this));
  },

  _toggleDialog: function() {
    this.$.dialog.toggle();
  },

  _computeLabel: function() {
    return this.i18n('replaceBlobButton.tooltip');
  },

  _isAvailable: function(doc) {
    return doc && this.hasPermission(doc, 'Write') && !this.isImmutable(doc) &&
      !this.hasType(doc, 'Root') && !this.isTrashed(doc);
  }
});
