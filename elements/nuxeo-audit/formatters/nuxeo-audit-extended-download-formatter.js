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

class NuxeoAuditExtendedDownloadFormatter extends mixinBehaviors([], Nuxeo.Element) {
  static get template() {
    return html`
      <p>[[_getDownloadType(item)]] by user</p>
    `;
  }

  static get is() {
    return 'nuxeo-audit-extended-download-formatter';
  }

  _getDownloadType(item) {
    // obs: nuxeo default - may be different by user
    // if blobXPath starts by file: then it's an explicit user download
    // else, it's a view
    return item.extended && item.extended.blobXPath && item.extended.blobXPath.split(':')[0] === 'file'
      ? 'Downloaded'
      : 'Viewed';
  }
}
customElements.define(NuxeoAuditExtendedDownloadFormatter.is, NuxeoAuditExtendedDownloadFormatter);
export default NuxeoAuditExtendedDownloadFormatter;
