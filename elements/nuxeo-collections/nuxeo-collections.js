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

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/neon-animation/neon-animatable.js';
import '@polymer/neon-animation/neon-animated-pages.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import '../nuxeo-keys/nuxeo-keys.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
 `nuxeo-collections`
 @group Nuxeo UI
 @element nuxeo-collections
 */
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
      :host {
        @apply --layout-vertical;
        @apply --layout-flex;
        display: block;
      }

      .header {
        align-items: var(--layout-center_-_align-items);
        font-size: 1rem;
        height: 53px;
        padding: 0 16px;
        text-overflow: ellipsis;
        color: var(--nuxeo-drawer-header);
      }

      nuxeo-data-list {
        height: calc(100vh - 61px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      nuxeo-data-list {
        display: block;
        position: relative;
      }

      .collections {
        height: calc(100vh - 61px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        overflow: auto;
      }

      neon-animatable.nuxeo-collections {
        box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.1);
      }

      .switch {
        position: absolute;
        top: 0;
        right: 0;
        width: 60px;
        height: 53px;
        padding: 16px;
        z-index: 101;
        border-left: 1px solid var(--divider-color);
      }

      .switch:hover {
        background-color: var(--nuxeo-button-primary);
        color: var(--nuxeo-button-primary-text);
      }

      .content {
        @apply --layout-flex;
        @apply --layout-vertical;
        height: calc(100vh - 61px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        width: 293px;
      }

      .collection-box {
        line-height: 155%;
      }

      .collection-box + .collection-box {
        border-top: 1px solid var(--divider-color);
      }

      iron-icon.collection-name-icon {
        height: 0.9em;
        width: 0.9em;
        border-radius: 50px;
        background-color: var(--dark-primary-color);
        color: white;
        padding: 0.4em;
      }

      .collection-name {
        font-weight: 700;
        margin-left: 0.5em;
      }

      .collection-detail {
        margin-left: 2.2em;
      }

      .collection-property {
        opacity: 0.5;
        margin-right: 0.2em;
      }

      .list-item {
        cursor: pointer;
        padding: 1em;
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .list-item:hover {
        @apply --nuxeo-block-hover;
      }

      .list-item.selected,
      .list-item:focus,
      .list-item.selected:focus {
        @apply --nuxeo-block-selected;
      }

      .list-item iron-icon {
        @apply --nuxeo-action;
      }

      .list-item iron-icon:hover {
        @apply --nuxeo-action-hover;
      }

      .remove {
        width: 1.7em;
        height: 1.7em;
        margin-left: 1em;
      }

      .list-item-property {
        opacity: 0.5;
        display: block;
        margin: 0.2em 0;
        font-size: 0.8rem;
      }

      .horizontal {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }
    </style>

    <nuxeo-operation op="Collection.RemoveFromCollection" id="removeFromCollectionOp"></nuxeo-operation>

    <div class="header ellipsis search-header">
      <template is="dom-if" if="[[_isDisplayMembers]]">
        <h5>[[selectedCollection.title]]</h5>
        <paper-icon-button
          class="switch"
          icon="icons:arrow-back"
          id="backToCollections"
          on-tap="displayCollections"
          aria-labelledby="backToCollectionsTooltip"
        >
        </paper-icon-button>
        <nuxeo-tooltip for="backToCollections" id="backToCollectionsTooltip"
          >[[i18n('collections.backToCollections')]]</nuxeo-tooltip
        >
      </template>
      <template is="dom-if" if="[[!_isDisplayMembers]]">
        <h5>[[i18n('collections.heading')]]</h5>
      </template>
    </div>

    <neon-animated-pages
      class="content"
      id="queues"
      selected="[[_selectedPage]]"
      entry-animation="[[_entryAnimation]]"
      exit-animation="[[_exitAnimation]]"
    >
      <neon-animatable>
        <div id="collections" class="collections" hidden$="{{_isDisplayMembers}}">
          <nuxeo-page-provider
            id="collectionsProvider"
            provider="user_collections"
            page-size="40"
            params='{"searchTerm":"%","user": "$currentUser"}'
            sort='{"dc:modified": "desc"}'
            schemas="dublincore,common"
            enrichers="permissions"
            headers='{"fetch-document": "properties"}'
          >
          </nuxeo-page-provider>

          <nuxeo-page-provider
            id="membersProvider"
            provider="default_content_collection"
            schemas="dublincore,common"
            page-size="40"
            enrichers="thumbnail, permissions"
          >
          </nuxeo-page-provider>

          <nuxeo-data-list
            nx-provider="collectionsProvider"
            id="collectionsList"
            selected-item="{{selectedCollection}}"
            selection-enabled
            select-on-tap
            as="collection"
            empty-label="[[i18n('collections.empty')]]"
            empty-label-when-filtered="[[i18n('collections.empty')]]"
          >
            <template>
              <div tabindex$="{{tabIndex}}" class$="[[_computedClass(selected)]]">
                <div class="collection-box">
                  <div class="collection-info horizontal layout center">
                    <iron-icon class="collection-name-icon" icon="nuxeo:collections"></iron-icon>
                    <span class="collection-name title">[[collection.title]]</span>
                  </div>
                  <div class="collection-detail">
                    <div class="date horizontal layout center">
                      <span class="collection-property">[[i18n('collections.lastModified')]] </span>
                      <nuxeo-date datetime="[[collection.properties.dc:modified]]"></nuxeo-date>
                    </div>
                    <div class="layout center horizontal">
                      <span class="collection-property">[[i18n('collections.ownedBy')]]</span>
                      <nuxeo-user-tag user="[[collection.properties.dc:creator]]"></nuxeo-user-tag>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </nuxeo-data-list>
        </div>
      </neon-animatable>

      <neon-animatable>
        <div id="queue" hidden$="{{!_isDisplayMembers}}">
          <nuxeo-data-list
            id="membersList"
            selected-item="{{selectedMember}}"
            selection-enabled
            select-on-tap
            as="member"
            nx-provider="membersProvider"
            empty-label="[[i18n('collections.members.empty')]]"
            empty-label-when-filtered="[[i18n('collections.members.empty')]]"
          >
            <template>
              <div tabindex$="{{tabIndex}}" class$="[[_computedClass(selected)]]">
                <div class="list-item-box">
                  <div class="list-item-info horizontal layout center">
                    <div class="vertical layout center">
                      <nuxeo-document-thumbnail document="[[member]]"></nuxeo-document-thumbnail>
                    </div>
                    <div class="flex">
                      <span class="list-item-title ellipsis">[[member.title]]</span>
                      <span class="list-item-property ellipsis">[[formatDocType(member.type)]]</span>
                    </div>
                    <iron-icon
                      id="removeFromCollection"
                      class="remove"
                      hidden$="[[!_canRemove(selectedCollection)]]"
                      icon="nuxeo:remove"
                      data-uid$="[[member.uid]]"
                      on-tap="_removeFromCollection"
                    >
                    </iron-icon>
                  </div>
                </div>
              </div>
            </template>
          </nuxeo-data-list>
        </div>
      </neon-animatable>
    </neon-animated-pages>

    <nuxeo-keys keys="right l" on-pressed="_navigateOnRight"></nuxeo-keys>
    <nuxeo-keys keys="left h" on-pressed="_navigateOnLeft"></nuxeo-keys>
    <nuxeo-keys keys="down j" on-pressed="_navigateOnDown"></nuxeo-keys>
    <nuxeo-keys keys="up k" on-pressed="_navigateOnUp"></nuxeo-keys>
  `,

  is: 'nuxeo-collections',
  behaviors: [RoutingBehavior, FormatBehavior, FiltersBehavior],

  properties: {
    selectedSearch: {
      type: String,
      value: 'faceted',
    },
    _isDisplayMembers: {
      type: Boolean,
      value: false,
      observer: '_observeIsDisplayMembers',
    },
    selectedCollection: {
      type: Object,
      observer: '_selectedCollectionChanged',
      notify: true,
    },
    selectedMember: {
      type: Object,
      observer: '_selectedMemberChanged',
      notify: true,
    },
    _entryAnimation: {
      type: String,
      value: 'slide-from-right-animation',
    },
    _exitAnimation: {
      type: String,
      value: 'slide-left-animation',
    },
    visible: {
      type: Boolean,
      observer: '_visibleChanged',
    },
  },

  _navigateOnRight(e) {
    if (!this._isDisplayMembers) {
      e.detail.keyboardEvent.preventDefault();
      if (this.selectedCollection) {
        this.displayMembers();
        this.$.membersList.fire('iron-resize');
        if (this.$.membersList.items.length > 0) {
          this.$.membersList.selectIndex(0);
        }
      }
      this._tmpJustRight = true;
    }
  },

  _navigateOnLeft(e) {
    if (this._isDisplayMembers) {
      e.detail.keyboardEvent.preventDefault();
      this.displayCollections();
      this.$.collectionsList.fire('iron-resize');
    }
    this._tmpJustLeft = true;
  },

  _navigateOnDown(e) {
    if (this._isDisplayMembers) {
      e.detail.keyboardEvent.preventDefault();
      if (this._tmpJustRight) {
        this.$.membersList.selectNext();
        this._tmpJustRight = false;
      }
    } else if (this._tmpJustLeft) {
      e.detail.keyboardEvent.preventDefault();
      this.$.collectionsList.selectNext();
      this._tmpJustLeft = false;
    }
  },

  _navigateOnUp(e) {
    if (this._isDisplayMembers) {
      if (this._tmpJustRight) {
        e.detail.keyboardEvent.preventDefault();
        this.$.membersList.selectPrevious();
        this._tmpJustRight = false;
      }
    } else if (this._tmpJustLeft) {
      e.detail.keyboardEvent.preventDefault();
      this.$.collectionsList.selectPrevious();
      this._tmpJustLeft = false;
    }
  },

  _observeIsDisplayMembers() {
    if (this._isDisplayMembers) {
      this._entryAnimation = 'slide-from-right-animation';
      this._exitAnimation = 'slide-left-animation';
      this._selectedPage = 1;
    } else {
      this._entryAnimation = 'slide-from-left-animation';
      this._exitAnimation = 'slide-right-animation';
      this._selectedPage = 0;
      if (this.selectedCollection) {
        this.fire('navigate', { doc: this.selectedCollection });
      }
    }
  },

  displayMembers(collection, index) {
    this._isDisplayMembers = true;
    if (typeof index === 'number') {
      if (this.selectedCollection && collection && this.selectedCollection.uid === collection.uid) {
        this.$.membersList.selectIndex(index);
        this.$.membersList.scrollToIndex(index);
      }
    }
  },

  displayCollections() {
    this._isDisplayMembers = false;
  },

  _removeFromCollection(evt) {
    const op = this.$.removeFromCollectionOp;
    const memberId = evt.currentTarget.dataset.uid;
    op.input = memberId;
    op.params = {
      collection: this.selectedCollection.uid,
    };
    op.execute().then(() => {
      this._removeFromMembers(memberId);
      this.fire('removed-from-collection', {
        innerRemove: true,
        doc: memberId,
        collectionId: evt.target.dataset.uid,
      });
    });
  },

  _removeFromMembers(uid) {
    const memberIndex = this.$.membersList.items.findIndex((el) => el.uid === uid);
    if (memberIndex > -1) {
      this.$.membersList.splice('items', memberIndex, 1);
      if (this.$.membersList.items.length > memberIndex) {
        this.$.membersList.selectIndex(memberIndex);
      } else {
        this.$.membersList.selectIndex(this.$.membersList.items.length - 1);
      }
    }
  },

  _computedClass(isSelected) {
    let classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },

  _selectedMemberChanged(doc) {
    if (doc) {
      this.navigateTo(doc);
    }
  },

  _selectedCollectionChanged(collection) {
    if (collection) {
      this.fire('navigate', { doc: collection });
    }
  },

  _isEmpty(items) {
    return items && items.length === 0;
  },

  ready() {
    window.addEventListener('added-to-collection', () => {
      if (this.visible) {
        this._refreshCollections();
        if (this._isDisplayMembers) {
          this.$.membersList.reset();
          this.$.membersList.fetch();
        }
      }
    });
    window.addEventListener('removed-from-collection', (e) => {
      if (this.visible) {
        if (e.detail.innerRemove) {
          return;
        }
        if (this.selectedCollection && this.selectedCollection.uid === e.detail.collectionId) {
          this._removeFromMembers(e.detail.doc.uid);
        } else if (!this._isDisplayMembers) {
          this._refreshCollections();
        }
      }
    });
  },

  _visibleChanged() {
    if (this.visible) {
      this.selectedCollection = null;
      this._refreshCollections();
      this.displayCollections();
    }
  },

  _canRemove(collection) {
    if (collection && collection.contextParameters && collection.contextParameters.permissions) {
      // NXP-21408: prior to 8.10-HF01 the permissions enricher wouldn't return ReadCanCollect
      // Action will therefore not be available
      return collection.contextParameters.permissions.indexOf('ReadCanCollect') > -1;
    }
    return false;
  },

  _refreshCollections() {
    this.$.collectionsList.reset();
    this.$.collectionsList.fetch();
  },

  loadCollection(collection) {
    if (collection && this.selectedCollection && this.selectedCollection.uid === collection.uid) {
      this.$.membersProvider.params = [collection.uid];
      this.$.membersList.reset();
      this.$.membersList.fetch();
      this.displayCollections();
    }
  },
});
