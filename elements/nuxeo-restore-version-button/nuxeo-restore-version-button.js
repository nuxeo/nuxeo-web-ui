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
`nuxeo-restore-version-button`
@group Nuxeo UI
@element nuxeo-restore-version-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '../nuxeo-confirm-button/nuxeo-confirm-button.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        display: inline-block;
      }

      nuxeo-confirm-button {
        display: inline-block;
      }

      nuxeo-confirm-button .version {
        font-weight: 500;
        padding-left: 8px;
      }

    </style>

    <nuxeo-operation id="opGetLatest" op="Proxy.GetSourceDocument" input="[[document.uid]]" response="{{latest}}">
    </nuxeo-operation>

    <nuxeo-operation id="opRestoreVersion" op="Document.RestoreVersion" input="[[document.uid]]">
    </nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(latest)]]">
      <nuxeo-confirm-button dialog-title="[[i18n('versions.confirm.title')]]" dialog-dismiss="[[i18n('label.no')]]" dialog-confirm="[[i18n('label.yes')]]" on-confirm="_restore">
        [[i18n('versions.restore')]]
        <span class="version">[[document.properties.uid:major_version]].[[document.properties.uid:minor_version]]
        </span>
      </nuxeo-confirm-button>
    </template>
`,

  is: 'nuxeo-restore-version-button',
  behaviors: [I18nBehavior, RoutingBehavior],

  properties: {
    document: Object,
    latest: Object
  },

  observers: [
    '_update(document)'
  ],

  _update: function() {
    if (this.document.isVersion) {
      this.$.opGetLatest.execute();
    } else {
      this.latest = null;
    }
  },

  _isAvailable: function() {
    if (this.document && this.latest) {
      var v1 = this.document.properties['uid:major_version'] + '.' +
        this.document.properties['uid:minor_version'];
      var v2 = this.latest.properties['uid:major_version'] + '.' +
        this.latest.properties['uid:minor_version'];
      return v1 === v2 ? this.latest.isCheckedOut : true;
    }
    return false;
  },

  _restore: function() {
    if (this.document) {
      this.$.opRestoreVersion.input = this.document.uid;
      this.$.opRestoreVersion.params = {checkout: true};
      this.$.opRestoreVersion.execute().then(function() {
        this.fire('document-updated');
        this.navigateTo('browse', this.document.path);
      }.bind(this));
    }
  }
});
