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
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';

/**
 `admin-ai-insight`
 @group Nuxeo UI
 @element admin-ai-insight
 */
class AdminAiInsight extends mixinBehaviors([I18nBehavior], Nuxeo.Element) {
  static get is() {
    return 'admin-ai-insight';
  }

  static get properties() {
    return {
      link: {
        type: String,
        value: '',
      },
    };
  }

  ready() {
    super.ready();
    this.$.aiInsight
      .execute()
      .then(({ url, aitoken, projectId, urlCore }) => {
        this.link = `${url}?aitoken=${aitoken}&projectid=${projectId}&urlCore=${urlCore}`;
      })
      .catch(() => {
        this.fire('notify', { message: this.i18n('admin.ai.cloud.error') });
      });
  }

  static get template() {
    return html`
      <style include="nuxeo-styles">
        .flex {
          @apply --layout-flex;
        }
        .page-insight {
          background: var(--nuxeo-page-background, #f5f5f5);
        }
        .content-insight {
          margin: 0 auto;
          text-align: center;
        }
        a {
          text-decoration: none;
          color: white;
        }
      </style>
      <nuxeo-operation id="aiInsight" op="AI.FetchInsightURI"></nuxeo-operation>
      <nuxeo-page class="page-insight">
        <div slot="header">
          <span class="flex">[[i18n('admin.ai.cloud.heading')]]</span>
        </div>
        <div class="content-insight">
          <img src="images/ai/nuxeo_insight.png" />
          <p>[[i18n('admin.ai.cloud.message')]]</p>
          <dom-if if="[[link]]">
            <template>
              <paper-button noink class="primary" animated>
                <a href$="{{link}}" target="_blank">[[i18n('admin.ai.cloud.link')]]</a>
              </paper-button>
            </template>
          </dom-if>
        </div>
      </nuxeo-page>
    `;
  }
}

customElements.define(AdminAiInsight.is, AdminAiInsight);
