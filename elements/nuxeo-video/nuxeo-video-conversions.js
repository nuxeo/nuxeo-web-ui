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
`nuxeo-video-conversions`
@group Nuxeo UI
@element nuxeo-video-conversions
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
Polymer({
  _template: html`
    <style include="iron-flex">
      a, a:active, a:visited, a:focus {
        @apply --nuxeo-link;
      }
      a:hover {
        @apply --nuxeo-link-hover;
      }
    </style>

    <h3>[[label]]</h3>
    <div>
      <template is="dom-repeat" items="[[document.properties.vid:transcodedVideos]]" as="conversion">
        <template is="dom-if" if="[[conversion.content]]">
          <div class="layout horizontal center">
            <label class="flex">[[conversion.name]]</label>
            <div class="flex">[[conversion.info.width]] x [[conversion.info.height]]</div>
            <div class="flex">[[formatSize(conversion.content.length)]]</div>
            <a href="[[conversion.content.data]]">
              <iron-icon icon="nuxeo:download"></iron-icon>
              <nuxeo-tooltip>[[i18n('videoViewLayout.download.tooltip')]]</nuxeo-tooltip>
            </a>
          </div>
        </template>
      </template>
    </div>
`,

  is: 'nuxeo-video-conversions',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    document: Object
  }
});
