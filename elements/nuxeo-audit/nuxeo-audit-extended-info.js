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
import DocHistoryExtendedFormatters from './nuxeo-audit-extended-formatters.js';

class NuxeoAuditExtendedInfo extends mixinBehaviors([], Nuxeo.Element) {
  static get template() {
    return html`
      <style></style>
      <div id="container"></div>
    `;
  }

  static get is() {
    return 'nuxeo-audit-extended-info';
  }

  static get observers() {
    return ['_updateContainer(item)'];
  }

  _updateContainer(item) {
    const formatter = DocHistoryExtendedFormatters.get(item.eventId);
    this._instance = document.createElement(formatter);
    this.$.container.appendChild(this._instance);
    this._instance.item = this.item;
  }
}

customElements.define(NuxeoAuditExtendedInfo.is, NuxeoAuditExtendedInfo);
