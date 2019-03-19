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
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';

import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';

let schemaFetcher = null;

/**
 * `Nuxeo.DocumentCreationBehavior`
 *
 * @polymerBehavior
 */
export const DocumentCreationBehavior = [
  FormatBehavior,
  RoutingBehavior,
  {
    properties: {
      parent: {
        type: Object,
        observer: '_parentChanged',
      },

      targetPath: {
        type: Object,
        notify: true,
      },

      suggesterParent: {
        type: Object,
      },

      suggesterChildren: {
        type: Array,
        observer: '_suggesterChildrenChanged',
        notify: true,
      },

      isValidTargetPath: {
        type: Boolean,
        notify: true,
      },

      canCreate: {
        type: Boolean,
        notify: true,
      },

      targetLocationError: {
        type: String,
        notify: true,
      },

      document: {
        type: Object,
      },

      selectedDocType: {
        type: String,
      },

      subtypes: {
        type: Array,
      },
    },

    observers: ['_validateLocation(isValidTargetPath,suggesterChildren)', '_updateDocument(selectedDocType, parent)'],

    newDocument(type, properties) {
      if (!schemaFetcher) {
        schemaFetcher = document.createElement('nuxeo-resource');
        this._attachDom(schemaFetcher);
      }
      schemaFetcher.path = `path/${this.targetPath}/@emptyWithDefault`;
      schemaFetcher.params = { type: this.selectedDocType.type };
      schemaFetcher.headers = {
        properties: '*',
        'X-NXfetch.document': 'properties',
        'X-NXtranslate.directoryEntry': 'label',
      };
      return schemaFetcher.get().then((doc) => {
        if (properties) {
          Object.keys(properties).forEach((prop) => {
            doc.properties[prop] = properties[prop];
          });
        }
        return doc;
      });
    },

    _parentChanged() {
      if (this.parent) {
        if (!this.targetPath || this.targetPath.replace(/(.+)\/$/, '$1') !== this.parent.path) {
          this.set('targetPath', this.parent.path);
        }
        const subtypes =
          this.parent.contextParameters && this.parent.contextParameters.subtypes
            ? this.parent.contextParameters.subtypes.map((type) => {
                type.id = type.type.toLowerCase();
                return type;
              })
            : [];
        const filteredSubtypes = [];
        if (this._canCreateIn(this.parent)) {
          subtypes.forEach((type) => {
            if (type.facets.indexOf('HiddenInCreation') === -1) {
              filteredSubtypes.push(type);
            }
          });
        }
        this.set(
          'subtypes',
          filteredSubtypes.sort((a, b) => {
            if (a.id < b.id) {
              return -1;
            }
            if (a.id > b.id) {
              return 1;
            }
            return 0;
          }),
        );
      }
      this._validateLocation();
    },

    _suggesterChildrenChanged() {
      const valid =
        (this.parent ? this.targetPath.replace(/(.+)\/$/, '$1') === this.parent.path : false) ||
        (this.suggesterParent ? this.targetPath.replace(/(.+)\/$/, '$1') === this.suggesterParent.path : false) ||
        (this.suggesterChildren ? this.suggesterChildren.some((child) => this.targetPath === child.path) : false);
      this.set('isValidTargetPath', valid);
      this.fire('nx-document-creation-suggester-parent-changed', { isValidTargetPath: valid });
    },

    _validateLocation() {
      if (!this.isValidTargetPath) {
        this.set('canCreate', false);
        this.set('errorMessage', this.i18n('documentCreationBehavior.error.invalidLocation'));
      } else if (!this._canCreateIn(this.parent)) {
        this.set('canCreate', false);
        this.set('errorMessage', this.i18n('documentCreationBehavior.error.noPermission'));
      } else if (this.subtypes && this.subtypes.length === 0) {
        this.set('canCreate', false);
        this.set('errorMessage', this.i18n('documentCreationBehavior.error.noSubtypes'));
      } else if (
        typeof this.selectedDocType === 'object' &&
        Object.keys(this.selectedDocType).length > 0 &&
        !this._isValidType(this.selectedDocType)
      ) {
        this.set('canCreate', false);
        this.set('errorMessage', this.i18n('documentCreationBehavior.error.invalidSubtype'));
      } else {
        this.set('canCreate', true);
        this.set('errorMessage', '');
      }
      this.fire('nx-document-creation-parent-validated');
    },

    _notify(response, close) {
      this.fire('document-created', { response });
      if (close === undefined) {
        close = true;
      }
      if (close) {
        this.fire('nx-document-creation-finished');
      }
    },

    _formatErrorMessage() {
      return this.errorMessage ? 'error' : '';
    },

    _canCreateIn(document) {
      if (document && document.contextParameters && document.contextParameters.permissions) {
        // NXP-21408: prior to 8.10-HF01 the permissions enricher wouldn't return AddChildren,
        // so we had to rely on Write.
        return (
          document.contextParameters.permissions.indexOf('Write') > -1 ||
          document.contextParameters.permissions.indexOf('AddChildren') > -1
        );
      }
      return false;
    },

    _sanitizeName(name) {
      return name.replace(/[\\/]/gi, '-');
    },

    _isValidType(type) {
      return (
        type &&
        this.subtypes &&
        this.subtypes.findIndex((t) => t._id === type._id && t.type === type.type && t.icon === type.icon) > -1
      );
    },

    _getTypeLabel(type) {
      return this._isValidType(type) ? this.formatDocType(type.id) : '';
    },

    _getTypeIcon(type) {
      return this._isValidType(type) ? `images/doctypes/${type.id}.svg` : '';
    },

    // extension point
    _getDocumentProperties() {
      return null;
    },

    // extension point
    _updateDocument() {},
  },
];
