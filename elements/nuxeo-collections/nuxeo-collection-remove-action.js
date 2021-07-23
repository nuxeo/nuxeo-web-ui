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
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';

/**
`nuxeo-collection-remove-action`
@group Nuxeo UI
@element nuxeo-collection-remove-action
*/
class NuxeoCollectionRemoveAction extends mixinBehaviors([NotifyBehavior, I18nBehavior], Nuxeo.OperationButton) {
  static get is() {
    return 'nuxeo-collection-remove-action';
  }

  static get properties() {
    return {
      members: {
        type: Object,
      },
      collection: {
        type: Object,
      },
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        computed: '_isHidden(members, collection)',
      },
    };
  }

  constructor() {
    super();
    this.icon = 'nuxeo:remove';
    this.label = 'collections.remove';
    this.event = 'refresh';
    this.operation = 'Collection.RemoveFromCollection';
    this.syncIndexing = true;
  }

  _execute() {
    this.remove();
  }

  _params() {
    return {
      collection: this.collection.uid,
    };
  }

  /**
   * Keeping the method to keep the API compatibility (it might be called from somewhere else since it's public API).
   */
  remove() {
    this.input = this.members;
    this.params = this._params();
    super._execute().then(() => {
      this.members = [];
    });
  }

  _isHidden(members, collection) {
    if (collection && collection.contextParameters && collection.contextParameters.permissions) {
      // NXP-21408: prior to 8.10-HF01 the permissions enricher wouldn't return ReadCanCollect
      // Action will therefore not be available
      return collection.contextParameters.permissions.indexOf('WriteProperties') < 0;
    }
    return true;
  }
}

window.customElements.define(NuxeoCollectionRemoveAction.is, NuxeoCollectionRemoveAction);
