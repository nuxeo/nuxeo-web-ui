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
`nuxeo-favorites`
@group Nuxeo UI
@element nuxeo-favorites
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '../nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">

      .content {
        @apply --layout-vertical;
      }

      nuxeo-data-list {
        display: block;
        position: relative;
        min-height: calc(100vh - 61px - var(--nuxeo-app-top))
      }

      .list-item {
        cursor: pointer;
        padding: 1em;
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .list-item-box {
        @apply --layout-vertical;
      }

      .list-item-info {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .list-item-thumbnail {
        @apply --layout-vertical;
        @apply --layout-center;
      }

      .list-item-title {
        @apply --layout-flex;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .list-item:hover {
        @apply --nuxeo-block-hover;
      }

      .list-item.selected,
      .list-item:focus,
      .list-item.selected:focus {
        @apply --nuxeo-block-selected;
      }

      .list-item-property {
        opacity: .5;
        margin-right: .2em;
      }

      .list-item iron-icon {
        display: block;
        @apply --nuxeo-action;
        color: var(--nuxeo-drawer-text);
      }

      .list-item iron-icon:hover {
        @apply --nuxeo-action-hover;
        color: var(--nuxeo-drawer-text);
      }

      .remove {
        width: 1.5em;
        height: 1.5em;
      }
    </style>

    <nuxeo-operation id="removeFromFavOp" op="Document.RemoveFromFavorites"></nuxeo-operation>

    <nuxeo-operation id="fetchFavOp" op="Favorite.Fetch" response="favorite"></nuxeo-operation>

    <nuxeo-page-provider id="favoritesProvider" provider="default_content_collection" page-size="30" schemas="dublincore,common" enrichers="thumbnail">
    </nuxeo-page-provider>

    <div class="header">[[i18n('app.favorites')]]</div>
    <div class="content">
      <nuxeo-data-list nx-provider="favoritesProvider" id="favoritesList" selected-item="{{selectedFavorite}}" items="{{favorites}}" selection-enabled="" select-on-tap="" as="favorite" empty-label="[[i18n('favorites.empty')]]" empty-label-when-filtered="[[i18n('favorites.empty')]]">
        <template>
          <div tabindex\$="{{tabIndex}}" class\$="[[_computedClass(selected)]]">
            <div class="list-item-box">
              <div class="list-item-info">
                <div class="list-item-thumb">
                  <nuxeo-document-thumbnail document="[[favorite]]"></nuxeo-document-thumbnail>
                </div>
                <div class="list-item-title">[[favorite.title]]</div>
                <iron-icon id="removeFromFavorites" class="remove" icon="nuxeo:remove" data-uid\$="[[favorite.uid]]" on-tap="_removeFromFavorites">
                </iron-icon>
              </div>
            </div>
          </div>
        </template>
      </nuxeo-data-list>

    </div>
`,

  is: 'nuxeo-favorites',
  behaviors: [Nuxeo.RoutingBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    favorites: {
      type: Object,
      notify: true
    },
    selectedFavorite: {
      type: Object,
      observer: '_selectedFavoriteChanged',
      notify: true
    },
    visible: {
      type: Boolean,
      observer: '_visibleChanged'
    }
  },

  _visibleChanged: function() {
    if (this.visible && !this.favorite) {
      this._refresh();
    }
  },

  ready: function() {
    window.addEventListener('added-to-favorites', this._refresh.bind(this));
    window.addEventListener('removed-from-favorites', this._refresh.bind(this));
  },

  _refresh: function() {
    this._fetchFavorite().then(function(favorite) {
      if (!favorite) {
        return;
      }
      this.$.favoritesProvider.params = [favorite.uid];
      this.$.favoritesProvider.page = 1;
      this.$.favoritesList.fetch();
    }.bind(this));
  },

  _fetchFavorite: function() {
    if (this.favorite) {
      return Promise.resolve(this.favorite);
    } else {
      return this.$.fetchFavOp.execute()
        .then(function(resp) {
          if (resp.status === 204) {
            // Pas de bras, pas de chocolat.
            this.favorite = null;
          } else {
            this.favorite = resp;
          }
          return this.favorite;
        }.bind(this));
    }
  },

  _computedClass: function(isSelected) {
    var classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },

  _selectedFavoriteChanged: function(doc) {
    if (doc) {
      if (doc.isVersion) {
        this.navigateTo('document', doc.uid);
      } else {
        this.navigateTo('browse', doc.path);
      }
    }
  },

  _removeFromFavorites: function(e) {
    e.stopImmediatePropagation();
    var docUid = e.model.favorite.uid;
    this.$.removeFromFavOp.input = docUid;
    this.$.removeFromFavOp.execute().then(function() {
      this.fire('removed-from-favorites', {docUid: docUid});
    }.bind(this));
  }
});
