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
limitations under the License. */
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';

import './nuxeo-picture-exif.js';
import './nuxeo-picture-info.js';
import './nuxeo-picture-formats.js';
import './nuxeo-picture-iptc.js';

import '../nuxeo-grid/nuxeo-grid.js';
import { animationFrame } from '@polymer/polymer/lib/utils/async.js';

/**
`nuxeo-picture-document-page`
@group Nuxeo UI
@element nuxeo-picture-document-page
*/
Polymer({
  _template: html`
    <style>
      /*.additional {
        @apply --layout-horizontal;
        @apply --layout-justified;
        @apply --layout-wrap;
        margin: -5px;
      }*/

      /*nuxeo-card {
        @apply --layout-flex;
        padding-right: 1.3rem;
        padding-bottom: 1.3rem;
        min-width: 384px;
        margin: 5px;
      }*/

      :host {
        --nuxeo-card-margin-bottom: 0; /* XXX */
        --paper-card_-_margin-bottom: 0; /* XXX */
        --nuxeo-card_-_margin-bottom: 0; /* XXX */
      }

      --paper-card: {
          display: block;
          padding: 16px;
          margin-bottom: 0;
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04) !important;
          font-family: var(--nuxeo-app-font);
          border-radius: 0;
          background-color: var(--nuxeo-box) !important;
        }

      nuxeo-card {
        min-width: 384px;
      }

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

      #documentViewsItems > nuxeo-page-item:first-of-type {
        margin: 0;
      }

      .scrollerHeader {
        @apply --layout-horizontal;
      }

      :host([opened]) .scrollerHeader {
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04) !important;
        border-radius: 0;
        background-color: var(--nuxeo-box) !important;
      }

      .page {
        @apply --layout-horizontal;
      }

      .main {
        @apply --layout-vertical;
        /* XXX @apply --layout-flex-2; */
        /* XXX padding-right: 8px; */
        overflow: hidden;
      }

      /* XXX :host([opened]) .main {
        padding-right: 16px;
      } */

      .side {
        @apply --layout-vertical;
        position: relative;
        margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
        min-height: 60vh;
      }

      :host([opened]) .side {
        @apply --layout-flex;
        min-width: 400px; /* XXX */
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
        box
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
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04) !important;
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
          /* XXX margin-bottom: 16px; */
        }

        .scroller {
          top: 0;
          position: relative;
          display: block;
        }
      }

      /* XXX */
      nuxeo-grid + nuxeo-grid {
        margin-top: 16px;
      }
    </style>

    <!-- grid with areas -->
    <nuxeo-grid>
      <nuxeo-grid-template gap="16px">
        <nuxeo-grid-area name="main" colspan="2" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="side" col="3" row="1"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-grid-template max-width="1024px">
        <nuxeo-grid-area name="main" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="side" col="1" row="2"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <div class="main" nuxeo-grid-area="main">
        <nuxeo-document-view document="[[document]]"></nuxeo-document-view>
      </div>

      <div class="side" nuxeo-grid-area="side">
        <div class="scrollerHeader">
          <paper-icon-button id="details" noink icon="nuxeo:details" on-tap="_toggleOpened"></paper-icon-button>
          <nuxeo-tooltip for="details">[[i18n('documentPage.details.opened')]]</nuxeo-tooltip>
        </div>
        <div class="scroller">
          <div class="section">
            <nuxeo-document-info document="[[document]]"></nuxeo-document-info>
          </div>

          <div class="section">
            <nuxeo-document-metadata document="[[document]]"></nuxeo-document-metadata>
          </div>

          <div class="section" hidden$="[[!_hasCollections(document)]]">
            <h3>[[i18n('documentPage.collections')]]</h3>
            <nuxeo-document-collections document="[[document]]"></nuxeo-document-collections>
          </div>

          <template is="dom-if" if="[[hasFacet(document, 'NXTag')]]">
            <div class="section">
              <h3>[[i18n('documentPage.tags')]]</h3>
              <nuxeo-tag-suggestion
                document="[[document]]"
                allow-new-tags
                placeholder="[[i18n('documentPage.tags.placeholder')]]"
                readonly="[[!isTaggable(document)]]"
              >
              </nuxeo-tag-suggestion>
            </div>
          </template>

          <div class="section">
            <paper-listbox id="documentViewsItems" selected="{{selectedTab}}" attr-for-selected="name">
              <template is="dom-if" if="[[hasFacet(document, 'Commentable')]]">
                <nuxeo-page-item name="comments" label="[[i18n('documentPage.comments')]]"></nuxeo-page-item>
              </template>
              <nuxeo-page-item name="activity" label="[[i18n('documentPage.activity')]]"></nuxeo-page-item>
            </paper-listbox>
            <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-item="{{page}}">
              <template is="dom-if" if="[[hasFacet(document, 'Commentable')]]">
                <nuxeo-document-comment-thread name="comments" uid="[[document.uid]]"></nuxeo-document-comment-thread>
              </template>
              <nuxeo-document-activity name="activity" document="[[document]]"></nuxeo-document-activity>
            </iron-pages>
          </div>
        </div>
      </div>
    </nuxeo-grid>

    <nuxeo-grid>
      <nuxeo-grid-template gap="16px">
        <nuxeo-grid-area name="info" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="2" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="2" row="2"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-grid-template min-width="1256px">
        <nuxeo-grid-area name="info" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="2" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="3" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="1" colspan="3" row="2"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-grid-template min-width="1668px">
        <nuxeo-grid-area name="info" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="2" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="3" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="4" row="1"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-grid-template max-width="1024px">
        <nuxeo-grid-area name="info" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="1" row="4"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-card heading="[[i18n('pictureViewLayout.info')]]" nuxeo-grid-area="info">
        <nuxeo-picture-info role="widget" document="[[document]]"></nuxeo-picture-info>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.formats')]]" nuxeo-grid-area="formats">
        <nuxeo-picture-formats role="widget" document="[[document]]"></nuxeo-picture-formats>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.exif')]]" nuxeo-grid-area="exif">
        <nuxeo-picture-exif role="widget" document="[[document]]"></nuxeo-picture-exif>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.iptc')]]" nuxeo-grid-area="iptc">
        <nuxeo-picture-iptc role="widget" document="[[document]]"></nuxeo-picture-iptc>
      </nuxeo-card>
    </nuxeo-grid>
  `,

  is: 'nuxeo-picture-document-page',
  behaviors: [LayoutBehavior],

  properties: {
    document: {
      type: Object,
    },
    selectedTab: {
      type: String,
      value: 'comments',
      notify: true,
    },
    opened: {
      type: Boolean,
      value: true,
      notify: true,
      reflectToAttribute: true,
      observer: '_openedChanged',
    },
  },

  _documentChanged(doc) {
    this.selectedTab = this.hasFacet(doc, 'Commentable') ? 'comments' : 'activity';
  },

  _openedChanged() {
    animationFrame.run(() => {
      // notify that there was a resize
      this.dispatchEvent(
        new CustomEvent('resize', {
          bubbles: false,
          composed: true,
        }),
      );
    });
  },

  _toggleOpened() {
    this.opened = !this.opened;
  },

  _isMutable(doc) {
    return !this.hasFacet(doc, 'Immutable') && doc.type !== 'Root' && !this.isTrashed(doc);
  },

  _hasCollections(doc) {
    return this.hasCollections(doc);
  },
});
