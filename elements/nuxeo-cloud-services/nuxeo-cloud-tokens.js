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

import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import './nuxeo-oauth2-provided-tokens.js';
import './nuxeo-oauth2-consumed-tokens.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
 * `nuxeo-cloud-tokens` allows declaring a Nuxeo cloud tokens.
 *     <nuxeo-cloud-tokens id="cloudTokens" name="cloudTokens">
 *     </nuxeo-cloud-tokens>
 *
 * @memberof Nuxeo
 */
class CloudTokens extends mixinBehaviors([I18nBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <nuxeo-card heading="[[i18n('cloudTokens.OAuth2Tokens.provided')]]">
        <nuxeo-oauth2-provided-tokens id="providedTokens" />
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('cloudTokens.OAuth2Tokens.consumed')]]">
        <nuxeo-oauth2-consumed-tokens id="consumedTokens" />
      </nuxeo-card>
    `;
  }

  static get is() {
    return 'nuxeo-cloud-tokens';
  }

  refresh() {
    this.$.providedTokens.refresh();
    this.$.consumedTokens.refresh();
  }
}

customElements.define(CloudTokens.is, CloudTokens);
Nuxeo.CloudTokens = CloudTokens;
