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
 `nuxeo-collections`
 @group Nuxeo UI
 @element nuxeo-collections
 */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/neon-animation/neon-animatable.js';
import '@polymer/neon-animation/neon-animated-pages.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '../nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import '../nuxeo-keys/nuxeo-keys.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
    :host {
      @apply --layout-vertical;
      @apply --layout-flex;
      display: block;
    }

    .header {
      line-height: 4.2rem;
      display: inline-block !important;
      white-space: nowrap;
      max-width: 70%;
      overflow: hidden;
    }

    nuxeo-data-list {
      height: calc(100vh - 61px - var(--nuxeo-app-top));
    }

    nuxeo-data-list {
      display: block;
      position: relative;
    }

    .collections {
      height: calc(100vh - 61px - var(--nuxeo-app-top));
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
      height: calc(100vh - 61px - var(--nuxeo-app-top));
      width: 293px;
    }

    .collection-box {
      line-height: 155%;
    }

    .collection-box + .collection-box {
      border-top: 1px solid var(--divider-color);
    }

    iron-icon.collection-name-icon {
      height: .9em;
      width: .9em;
      border-radius: 50px;
      background-color: var(--dark-primary-color);
      color: white;
      padding: .4em;
    }

    .collection-name {
      font-weight: 700;
      margin-left: .5em;
    }

    .collection-detail {
      margin-left: 2.2em;
    }

    .collection-property {
      opacity: .5;
      margin-right: .2em;
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
      opacity: .5;
      display: block;
      margin: .2em 0;
      font-size: .8rem;
    }

    .horizontal {
      @apply --layout-flex;
      @apply --layout-horizontal;
    }
    </style>

    <nuxeo-operation op="Collection.RemoveFromCollection" id="removeFromCollectionOp"></nuxeo-operation>

    <div class="header ellipsis search-header">
      <template is="dom-if" if="[[_isDisplayMembers]]">
        [[selectedCollection.title]]
        <paper-icon-button class="switch" icon="icons:arrow-back" id="backToCollections" on-tap="displayCollections">
        </paper-icon-button>
        <nuxeo-tooltip for="backToCollections">[[i18n('collections.backToCollections')]]</nuxeo-tooltip>
      </template>
      <template is="dom-if" if="[[!_isDisplayMembers]]">
        [[i18n('collections.heading')]]
      </template>
    </div>


      <neon-animated-pages class="content" id="queues" selected="[[_selectedPage]]" entry-animation="[[_entryAnimation]]" exit-animation="[[_exitAnimation]]">
        <neon-animatable>

          <div id="collections" class="collections" hidden\$="{{_isDisplayMembers}}">
            <nuxeo-page-provider id="collectionsProvider" provider="user_collections" page-size="40" params="{&quot;searchTerm&quot;:&quot;%&quot;,&quot;user&quot;:&quot;\$currentUser&quot;}" sort="{&quot;dc:modified&quot;:&quot;desc&quot;}" schemas="dublincore,common" enrichers="permissions" headers="{&quot;X-NXfetch.document&quot;: &quot;properties&quot;}">
            </nuxeo-page-provider>

            <nuxeo-data-list nx-provider="collectionsProvider" id="collectionsList" selected-item="{{selectedCollection}}" selection-enabled="" select-on-tap="" as="collection" empty-label="[[i18n('collections.empty')]]" empty-label-when-filtered="[[i18n('collections.empty')]]">
              <template>
                <div tabindex\$="{{tabIndex}}" class\$="[[_computedClass(selected)]]">
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
                      <div class="layout center">
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

          <div id="queue" hidden\$="{{!_isDisplayMembers}}">
            <nuxeo-data-list id="membersList" selected-item="{{selectedMember}}" selection-enabled="" select-on-tap="" as="member" empty-label="[[i18n('collections.members.empty')]]" empty-label-when-filtered="[[i18n('collections.members.empty')]]">
              <template>
                <div tabindex\$="{{tabIndex}}" class\$="[[_computedClass(selected)]]">

                  <div class="list-item-box">
                    <div class="list-item-info horizontal layout center">
                      <div class="vertical layout center">
                        <nuxeo-document-thumbnail document="[[member]]"></nuxeo-document-thumbnail>
                      </div>
                      <div class="flex">
                        <span class="list-item-title ellipsis">[[member.title]]</span>
                        <span class="list-item-property ellipsis">[[formatDocType(member.type)]]</span>
                      </div>
                      <iron-icon id="removeFromCollection" class="remove" hidden\$="[[!_canRemove(selectedCollection)]]" icon="nuxeo:remove" data-uid\$="[[member.uid]]" on-tap="_removeFromCollection">
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
  behaviors: [Nuxeo.RoutingBehavior, FormatBehavior, FiltersBehavior],

  properties: {

    selectedSearch: {
      type: String,
      value: 'faceted'
    },
    _isDisplayMembers: {
      type: Boolean,
      value: false,
      observer: '_observeIsDisplayMembers'
    },
    selectedCollection: {
      type: Object,
      observer: '_selectedCollectionChanged',
      notify: true
    },
    selectedMember: {
      type: Object,
      observer: '_selectedMemberChanged',
      notify: true
    },
    _entryAnimation: {
      type: String,
      value: 'slide-from-right-animation'
    },
    _exitAnimation: {
      type: String,
      value: 'slide-left-animation'
    },
    visible: {
      type: Boolean,
      observer: '_visibleChanged'
    }
  },

  _navigateOnRight: function(e) {
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

  _navigateOnLeft: function(e) {
    if (this._isDisplayMembers) {
      e.detail.keyboardEvent.preventDefault();
      this.displayCollections();
      this.$.collectionsList.fire('iron-resize');
    }
    this._tmpJustLeft = true;
  },

  _navigateOnDown: function(e) {
    if (this._isDisplayMembers) {
      e.detail.keyboardEvent.preventDefault();
      if (this._tmpJustRight) {
        this.$.membersList.selectNext();
        this._tmpJustRight = false;
      }
    } else {
      if (this._tmpJustLeft) {
        e.detail.keyboardEvent.preventDefault();
        this.$.collectionsList.selectNext();
        this._tmpJustLeft = false;
      }
    }
  },

  _navigateOnUp: function(e) {
    if (this._isDisplayMembers) {
      if (this._tmpJustRight) {
        e.detail.keyboardEvent.preventDefault();
        this.$.membersList.selectPrevious();
        this._tmpJustRight = false;
      }
    } else {
      if (this._tmpJustLeft) {
        e.detail.keyboardEvent.preventDefault();
        this.$.collectionsList.selectPrevious();
        this._tmpJustLeft = false;
      }
    }
  },

  _observeIsDisplayMembers: function() {
    if (this._isDisplayMembers) {
      this._entryAnimation = 'slide-from-right-animation';
      this._exitAnimation = 'slide-left-animation';
      this._selectedPage = 1;
    } else {
      this._entryAnimation = 'slide-from-left-animation';
      this._exitAnimation = 'slide-right-animation';
      this._selectedPage = 0;
      if (this.selectedCollection) {
        this.fire('navigate', {doc: this.selectedCollection});
      }
    }
  },

  displayMembers: function(collection, index) {
    this._isDisplayMembers = true;
    if (typeof index === 'number') {
      if (this.selectedCollection && collection && this.selectedCollection.uid === collection.uid) {
        this.$.membersList.selectIndex(index);
        this.$.membersList.scrollToIndex(index);
      }
    }
  },

  displayCollections: function() {
    this._isDisplayMembers = false;
  },

  _removeFromCollection: function(evt) {
    var op = this.$.removeFromCollectionOp;
    var memberId = evt.currentTarget.dataset.uid;
    op.input = memberId;
    op.params = {
      'collection': this.selectedCollection.uid
    };
    op.execute().then(function() {
      this._removeFromMembers(memberId)
      this.fire('removed-from-collection',
        {
          innerRemove: true,
          doc: memberId,
          collectionId: evt.target.dataset.uid

        }
      );
    }.bind(this));
  },

  _removeFromMembers: function(uid) {
    var memberIndex = memberIndex = this.$.membersList.items.findIndex(function(el) {
      return el.uid === uid;
    });
    if (memberIndex > -1) {
      this.$.membersList.splice('items', memberIndex, 1);
      if (this.$.membersList.items.length > memberIndex) {
        this.$.membersList.selectIndex(memberIndex);
      } else {
        this.$.membersList.selectIndex(this.$.membersList.items.length - 1);
      }
    }
  },

  _computedClass: function(isSelected) {
    var classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },

  _selectedMemberChanged: function(doc) {
    if (doc) {
      if (doc.isVersion) {
        this.navigateTo('document', doc.uid);
      } else {
        this.navigateTo('browse', doc.path);
      }
    }
  },

  _selectedCollectionChanged: function(collection) {
    if (collection) {
      this.fire('navigate', {doc: collection});
    }
  },

  _isEmpty: function(items) {
    return items && items.length === 0;
  },

  ready: function() {
    window.addEventListener('added-to-collection', function() {
      if (this.visible) {
        this._refreshCollections();
      }
    }.bind(this));
    window.addEventListener('removed-from-collection', function(e) {
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
    }.bind(this));

  },

  _visibleChanged: function() {
    if (this.visible) {
      this.selectedCollection = null;
      this._refreshCollections();
      this.displayCollections();
    }
  },

  _canRemove: function(collection) {
    if (collection && collection.contextParameters && collection.contextParameters.permissions) {
      // NXP-21408: prior to 8.10-HF01 the permissions enricher wouldn't return ReadCanCollect
      // Action will therefore not be available
      return collection.contextParameters.permissions.indexOf('ReadCanCollect') > -1;
    }
    return false;
  },

  _refreshCollections: function() {
    this.$.collectionsList.reset();
    this.$.collectionsList.fetch();
  },

  loadCollection: function(collection, provider) {
    if (provider) {
      this.$.membersList.nxProvider = provider;
      if (collection && this.selectedCollection && this.selectedCollection.uid === collection.uid) {
        this.$.membersList.reset();
        this.$.membersList.fetch();
        this.displayCollections();
      }
    }
  }
});
