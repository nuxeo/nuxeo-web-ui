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
`nuxeo-document-versions`
@group Nuxeo UI
@element nuxeo-document-versions
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-scroll-threshold/iron-scroll-threshold.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import './nuxeo-document-versions-list.js';
import './nuxeo-document-create-version.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        display: inline-block;
        min-width: 60px;
      }

      .toggle {
        padding: 0;
        cursor: pointer;
      }

      .toggle-text {
        display: inline-block;
        padding: 4px 0 4px 8px;
      }

      .toggle-icon {
        width: 20px;
        height: 20px;
      }

      .version {
        @apply --layout-vertical;
        @apply --layout-start;
        padding: 8px;
        cursor: pointer;
        border-top: 1px solid var(--divider-color);
      }

      .version:hover {
        @apply --nuxeo-block-hover;
      }

      .version .row {
        @apply --layout-horizontal;
        @apply --layout-start;
        margin: 0;
        padding: 0;
      }

      .version .row * {
        display: inline-block;
        text-align: left;
      }

      .version .modified {
        font-size: .8rem;
        margin-top: 4px;
        opacity: .3;
      }

      .version .latest {
        margin: 8px 0;
      }

      iron-scroll-threshold {
        display: none;
      }

      #list-items {
        max-height: 50vh;
        overflow-y: auto;
      }
    </style>

    <nuxeo-operation id="opGetLatest" op="Proxy.GetSourceDocument" input="[[document.uid]]" response="{{latest}}">
    </nuxeo-operation>

    <nuxeo-page-provider id="provider" query="[[query]]" page-size="[[pageSize]]" page="{{page}}" sort="{&quot;uid:major_version&quot;: &quot;desc&quot;, &quot;uid:minor_version&quot;: &quot;desc&quot;}" schemas="dublincore,common,uid">
    </nuxeo-page-provider>

    <nuxeo-document-create-version document="[[document]]" hidden\$="[[hasVersions(document)]]" label="[[_labelCreate(document)]]">
    </nuxeo-document-create-version>

    <div hidden\$="[[!hasVersions(document)]]">
      <nuxeo-tag class="toggle" on-tap="_showList">
        <div class="toggle-text">[[_labelTitle(document)]][[_labelCheckedOut(document)]]</div>
        <iron-icon class="toggle-icon" icon="icons:arrow-drop-down"></iron-icon>
      </nuxeo-tag>
      <nuxeo-document-versions-list id="list">
        <div id="list-items" slot="items">
          <template is="dom-if" if="[[document.isVersion]]">
            <div class="version" on-tap="_showLatest">
              <div id="version-latest" class="row title latest">[[_labelLatest(latest)]]</div>
            </div>
          </template>
          <template is="dom-repeat" items="[[versions]]" as="item">
            <div name="version-item" class="version" on-tap="_showVersion">
              <div id="version-id-[[index]]" class="row title">[[_labelTitle(item)]]</div>
              <div class="row modified">[[_labelModified(item)]]</div>
            </div>
          </template>
        </div>
        <nuxeo-document-create-version slot="actions" document="[[document]]" hidden\$="[[!_isCheckedOut(document)]]" on-dialog-closed="_hideList">
        </nuxeo-document-create-version>
      </nuxeo-document-versions-list>
      <iron-scroll-threshold id="scrollThreshold" scroll-target="list-items" lower-threshold="500" on-lower-threshold="_loadMore">
      </iron-scroll-threshold>
    </div>

    <template is="dom-if" if="[[document.isVersion]]">
      <nuxeo-tooltip for="version-latest" position="right">[[latest.title]]</nuxeo-tooltip>
    </template>
    <template is="dom-repeat" items="[[versions]]" as="item">
      <nuxeo-tooltip for="version-id-[[index]]" position="right">[[item.title]]</nuxeo-tooltip>
    </template>
`,

  is: 'nuxeo-document-versions',
  behaviors: [RoutingBehavior, FormatBehavior, FiltersBehavior],

  properties: {
    document: Object,
    latest: Object,
    versions: {
      type: Array,
      value: [],
      notify: true
    },
    query: String,
    page: {
      type: Number,
      value: 0
    },
    pageSize: {
      type: Number,
      value: 100
    }
  },

  observers: [
    '_update(document.*)'
  ],

  _update: function() {
    if (this.document) {
      if (this.document.isVersion) {
        this.$.opGetLatest.execute().then(function() {
          this._query(this.latest.uid);
        }.bind(this));
      } else {
        this._query(this.document.uid);
      }
    }
  },

  _isCheckedOut: function(doc) {
    return doc && doc.isCheckedOut;
  },

  _query: function(id) {
    this.query = 'SELECT * FROM Document WHERE ecm:versionVersionableId = "' + id + '" AND ecm:isVersion = 1';
    this.page = 0;
    this._loadMore();
  },

  _loadMore: function() {
    this.$.scrollThreshold.clearTriggers();
    if (this.query && (this.$.provider.isNextPageAvailable || this.page === 0)) {
      this.page = this.page + 1;
      this.$.provider.fetch().then(function(results) {
        if (this.page === 1) {
          this.set('versions', []);
        }
        if (results) {
          results.entries.forEach(function(doc) {
            this.push('versions', doc);
          }.bind(this));
        }
      }.bind(this));
    }
  },

  _showList: function() {
    this.$.list.open();
  },

  _hideList: function() {
    this.$.list.close();
  },

  _showLatest: function() {
    this._hideList();
    this.navigateTo('browse', this.document.path);
  },

  _showVersion: function(e) {
    this._hideList();
    this.navigateTo('document', e.model.item.uid);
  },

  _labelCreate: function(doc) {
    var permission = !this.isVersion(doc) && this.hasFacet(doc, 'Versionable') && this.hasPermission(doc, 'Write');
    return this.i18n(permission ? 'versions.create' : 'versions.unversioned');
  },

  _labelLatest: function(doc) {
    if (doc) {
      var number = this.i18n('versions.version',
          doc.properties['uid:major_version'], doc.properties['uid:minor_version']) +
        ((doc.isCheckedOut) ? '+ ' : ' ');
      var label = (doc.isCheckedOut) ?
        this.i18n('versions.unversionedChanges') :
        this.i18n('versions.latest');
      return number + label;
    }
    this._hideList();
    return '';
  },

  _labelTitle: function(doc) {
    if (doc) {
      return this.i18n('versions.version',
        doc.properties['uid:major_version'], doc.properties['uid:minor_version']);
    }
    return '';
  },

  _labelCheckedOut: function(doc) {
    return (doc && doc.isCheckedOut) ? '+' : '';
  },

  _labelModified: function(doc) {
    return this.i18n('versions.modified',
      moment().to(doc.properties['dc:modified']), doc.properties['dc:lastContributor']);
  },

  _date: function(date) {
    return moment(date).format('DD/MM/YYYY HH:mm');
  }
});
