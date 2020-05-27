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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';

class NuxeoAuditExtendedDefaultFormatter extends mixinBehaviors([], Nuxeo.Element) {
  static get template() {
    return html`
      <span>[[_parseExtended(item)]]</span>
    `;
  }

  static get is() {
    return 'nuxeo-document-history-extended-default-formatter';
  }

  _parseExtended(item) {
    return JSON.stringify(item.extended, null, '\t');
  }
}
customElements.define(NuxeoAuditExtendedDefaultFormatter.is, NuxeoAuditExtendedDefaultFormatter);
export default NuxeoAuditExtendedDefaultFormatter;
