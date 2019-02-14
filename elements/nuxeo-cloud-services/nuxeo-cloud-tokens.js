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
`nuxeo-cloud-tokens`
@group Nuxeo UI
@element nuxeo-cloud-tokens
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import './nuxeo-oauth2-tokens.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <nuxeo-resource id="tokens" path="oauth2/token/"></nuxeo-resource>
    <nuxeo-card heading="[[i18n('cloudTokens.OAuth2Tokens')]]">
      <nuxeo-oauth2-tokens tokens="[[tokens]]" on-oauth2-token-saved="refresh" on-oauth2-token-deleted="refresh"></nuxeo-oauth2-tokens>
    </nuxeo-card>
`,

  is: 'nuxeo-cloud-tokens',
  behaviors: [I18nBehavior],

  properties: {
    tokens: {
      type: Array,
      value: []
    }
  },

  refresh: function() {
    this.$.tokens.get().then(function(response) {
      this.tokens = response.entries;
    }.bind(this));
  }
});
