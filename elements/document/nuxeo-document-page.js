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
`nuxeo-document-page`
@group Nuxeo UI
@element nuxeo-document-page
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '../nuxeo-app/nuxeo-page-item.js';
import '../nuxeo-document-info-bar/nuxeo-document-info-bar.js';
import '../nuxeo-document-info/nuxeo-document-info.js';
import '../nuxeo-collections/nuxeo-document-collections.js';
import '../nuxeo-document-activity/nuxeo-document-activity.js';
import '../nuxeo-document-comments/nuxeo-document-comment-thread.js';
import './nuxeo-document-view.js';
import './nuxeo-document-metadata.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { animationFrame } from '@polymer/polymer/lib/utils/async.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      #details {
        width: 28px;
        height: 28px;
        padding: 5px;
        opacity: 0.3;
        margin: 6px 0;
      }

      :host([opened]) #details {
        opacity: 1;
        margin-left: 6px;
      }

      #documentViewsItems {
        @apply --layout-horizontal;
        --paper-listbox-background-color: transparent;
      }

      #documentViewsItems > [name='comments'] {
        margin: 0;
      }

      .scrollerHeader {
        @apply --layout-horizontal;
      }

      :host([opened]) .scrollerHeader {
        box-shadow: 0 3px 5px rgba(0,0,0,0.04) !important;
        border-radius: 0;
        background-color: var(--nuxeo-box) !important;
      }

      .page {
        @apply --layout-horizontal;
      }

      .main {
        @apply --layout-vertical;
        @apply --layout-flex-2;
        padding-right: 8px;
        overflow: hidden;
      }

      :host([opened]) .main {
        padding-right: 16px;
      }

      .side {
        @apply --layout-vertical;
        position: relative;
        margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
        min-height: 60vh;
      }

      :host([opened]) .side {
        @apply --layout-flex;
      }

      .scroller {
        @apply --nuxeo-card;
        margin-bottom: 0;
        overflow: auto;
        display: none;
        left: 0;
        top: 36px;
        right: 0;
        bottom: 0;
        position: absolute;
      }

      :host([opened]) .scroller {
        display: block;
      }

      .section {
        margin-bottom: 32px;
      }

      .section:last-of-type {
        margin-bottom: 64px;
      }

      nuxeo-document-view {
        --nuxeo-document-content-margin-bottom: var(--nuxeo-card-margin-bottom);
      }

      @media (max-width: 1024px) {
        #details {
          opacity: 1;
          margin-left: 6px;
          cursor: default;
        }

        .scrollerHeader {
          box-shadow: 0 3px 5px rgba(0,0,0,0.04) !important;
          font-family: var(--nuxeo-app-font);
          border-radius: 0;
          background-color: var(--nuxeo-box) !important;
        }

        .page {
          @apply --layout-vertical;
        }

        .main,
        :host([opened]) .main {
          padding: 0;
          max-width: initial;
          margin-right: 0;
        }

        .side {
          padding: 0;
          max-width: initial;
          min-height: initial;
          display: block;
          margin-bottom: 16px;
        }

        .scroller {
          top: 0;
          position: relative;
          display: block;
        }
      }
    </style>

    <nuxeo-document-info-bar document="[[document]]"></nuxeo-document-info-bar>

    <div class="page">

      <div class="main">
        <nuxeo-document-view document="[[document]]"></nuxeo-document-view>
      </div>

      <div class="side">
        <div class="scrollerHeader">
          <paper-icon-button id="details" noink="" icon="nuxeo:details" on-tap="_toggleOpened"></paper-icon-button>
          <nuxeo-tooltip for="details">[[i18n('documentPage.details.opened')]]</nuxeo-tooltip>
        </div>
        <div class="scroller">
          <!-- info -->
          <div class="section">
            <nuxeo-document-info document="[[document]]"></nuxeo-document-info>
          </div>

          <!-- metadata -->
          <div class="section">
            <nuxeo-document-metadata document="[[document]]"></nuxeo-document-metadata>
          </div>

          <!-- collections -->
          <div class="section" hidden\$="[[!_hasCollections(document)]]">
            <h3>[[i18n('documentPage.collections')]]</h3>
            <nuxeo-document-collections document="[[document]]"></nuxeo-document-collections>
          </div>

          <!-- tags -->
          <template is="dom-if" if="[[hasFacet(document, 'NXTag')]]">
            <div class="section">
              <h3>[[i18n('documentPage.tags')]]</h3>
              <nuxeo-tag-suggestion document="[[document]]" allow-new-tags="" placeholder="[[i18n('documentPage.tags.placeholder')]]" readonly="[[!isTaggable(document)]]">
              </nuxeo-tag-suggestion>
            </div>
          </template>

          <!-- activity -->
          <div class="section">
            <paper-listbox id="documentViewsItems" selected="{{selectedTab}}" attr-for-selected="name">
              <nuxeo-page-item name="comments" label="[[i18n('documentPage.comments')]]"></nuxeo-page-item>
              <nuxeo-page-item name="activity" label="[[i18n('documentPage.activity')]]"></nuxeo-page-item>
            </paper-listbox>
            <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-item="{{page}}">
              <nuxeo-document-comment-thread name="comments" uid="[[document.uid]]"></nuxeo-document-comment-thread>
              <nuxeo-document-activity name="activity" document="[[document]]"></nuxeo-document-activity>
            </iron-pages>
          </div>
        </div>
      </div>
    </div>
`,

  is: 'nuxeo-document-page',
  behaviors: [Nuxeo.LayoutBehavior],

  properties: {
    document: {
      type: Object
    },
    selectedTab: {
      type: String,
      value: 'comments',
      notify: true
    },
    opened: {
      type: Boolean,
      value: false,
      notify: true,
      reflectToAttribute: true,
      observer: '_openedChanged',
    }
  },

  _openedChanged: function() {
    animationFrame.run(function() {
      // notify that there was a resize
      this.dispatchEvent(new CustomEvent('resize', {
        bubbles: false,
        composed: true,
      }));
    });
  },

  _toggleOpened: function() {
    this.opened = !this.opened;
  },

  _isMutable: function(doc) {
    return !this.hasFacet(doc, 'Immutable') && doc.type !== 'Root' && !this.isTrashed(doc);
  },

  _hasCollections: function(doc) {
    return this.hasCollections(doc);
  }
});
