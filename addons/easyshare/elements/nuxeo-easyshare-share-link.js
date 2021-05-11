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
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';

/**
`nuxeo-easyshare-share-link`
@group Nuxeo UI
@element nuxeo-easyshare-share-link
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: inline-block;
      }

      .horizontal {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-justified;
      }

      .selected {
        color: var(--nuxeo-primary-color, #0066ff);
        pointer-events: none;
      }

      iron-icon {
        cursor: pointer;
        margin: 20px 0 0 10px;
      }

      iron-icon:hover {
        color: var(--nuxeo-primary-color, #0066ff);
      }

      nuxeo-input {
        cursor: text;
        overflow: hidden;
        @apply --layout-flex;
      }
    </style>
    <nuxeo-connection id="nxcon"></nuxeo-connection>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="_toggleDialog">
        <paper-icon-button id="shareBtn" icon="[[icon]]" noink aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[_label]]</span>
        <nuxeo-tooltip>[[_label]]</nuxeo-tooltip>
      </div>
    </template>

    <nuxeo-dialog id="dialog" with-backdrop>
      <div>
        <h2>[[i18n('shareButton.dialog.heading')]]</h2>
      </div>
      <div id="permanent" class="horizontal">
        <nuxeo-input
          id="permalink"
          label="[[i18n('easyshare.copy.label', document.properties.dc:title)]]"
          value="[[_buildPermalink(document)]]"
          readonly
        >
        </nuxeo-input>
        <iron-icon id="permalinkIcon" name="permalinkIcon" icon="link" on-tap="_copyLink"></iron-icon>
        <nuxeo-tooltip id="tooltip" for="permalinkIcon">[[i18n('shareButton.operation.copy')]]</nuxeo-tooltip>
      </div>

      <template is="dom-if" if="[[_isEasyshare(document)]]">
        <div id="easyShare" class="horizontal">
          <nuxeo-input
            id="easyShareLink"
            label="[[i18n('easysharefolder.share', document.properties.dc:title)]]"
            value="[[_buildEasysharelink(document)]]"
            readonly
          >
          </nuxeo-input>
          <iron-icon id="easyShareIcon" name="easyShareIcon" icon="link" on-tap="_copyLink"></iron-icon>
          <nuxeo-tooltip id="tooltip" for="easyShareIcon">[[i18n('shareButton.operation.copy')]]</nuxeo-tooltip>
        </div>
      </template>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('shareButton.dialog.close')]]</paper-button>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-easyshare-share-link',
  behaviors: [NotifyBehavior, I18nBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
    },

    /**
     * Icon to use (iconset_name:icon_name).
     */
    icon: {
      type: String,
      value: 'nuxeo:share',
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    _label: {
      type: String,
      computed: '_computeLabel(i18n)',
    },
  },

  _toggleDialog() {
    this.$.dialog.toggle();
  },

  _isAvailable(document) {
    return document;
  },

  _isEasyshare(document) {
    return document && document.type === 'EasyShareFolder';
  },

  _buildPermalink(document) {
    return document ? `${window.location.origin + window.location.pathname}#!/doc/${document.uid}` : '';
  },

  _buildEasysharelink(document) {
    const baseUrl = window.location.origin + this.$.nxcon.url;
    return document ? `${baseUrl}/site/easyshare/${this.document.uid}` : '';
  },

  _computeLabel() {
    return this.i18n('shareButton.tooltip');
  },

  _copyLink(e) {
    const shareButton = e.currentTarget;
    const link = shareButton.previousElementSibling;

    const otherShareButton = shareButton.id === 'easyShareIcon' ? this.$.permalinkIcon : this.$$('#easyShareIcon');
    if (
      otherShareButton &&
      otherShareButton.display !== 'none' &&
      otherShareButton._debouncer &&
      otherShareButton._debouncer.isActive()
    ) {
      otherShareButton._debouncer = otherShareButton._debouncer.flush();
    }

    // Select Link
    link.$.paperInput.$.nativeInput.select();
    if (!window.document.execCommand('copy')) {
      return;
    }

    shareButton._debouncer = Debouncer.debounce(shareButton._debouncer, timeOut.after(2000), () => {
      // Unselect Link
      link.$.paperInput.$.nativeInput.setSelectionRange(0, 0);
      link.$.paperInput.blur();

      shareButton.set('icon', 'link');
      shareButton.classList.remove('selected');
    });

    shareButton.set('icon', 'check');
    shareButton.classList.add('selected');
    this.notify({ message: this.i18n('shareButton.operation.copied'), duration: 2000 });
  },
});
