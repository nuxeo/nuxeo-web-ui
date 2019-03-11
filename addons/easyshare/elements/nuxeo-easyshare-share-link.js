<!--
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
-->

<!--
`nuxeo-easyshare-share-link`
@group Nuxeo UI
@element nuxeo-easyshare-share-link
-->
<dom-module id="nuxeo-easyshare-share-link">
  <template>
    <style>
      :host {
        display: inline-block;
      }

      .heading {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-justified;
      }
    </style>
    <nuxeo-connection id="nxcon"></nuxeo-connection>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="_toggleDialog">
        <paper-icon-button id="shareBtn" icon="[[icon]]" noink></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[i18n('shareButton.tooltip')]]</span>
      </div>
      <nuxeo-tooltip for="shareBtn">[[i18n('shareButton.tooltip')]]</nuxeo-tooltip>
    </template>

    <nuxeo-dialog id="dialog" with-backdrop>
      <div class="heading">
        <h2>[[i18n('shareButton.dialog.heading')]]</h2>
      </div>
      <nuxeo-input id="permalink"
                   label="[[i18n('easyshare.copy.label', document.properties.dc:title)]]"
                   value="[[_buildPermalink(document)]]"
                   autofocus
                   readonly>
      </nuxeo-input>

      <template is="dom-if" if="[[_isEasyshare(document)]]">
        <nuxeo-input id="easyshareLink"
                     label="[[i18n('easysharefolder.share', document.properties.dc:title)]]"
                     value="[[_buildEasysharelink(document)]]"
                     autofocus
                     readonly>
        </nuxeo-input>
      </template>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('shareButton.dialog.close')]]</paper-button>
      </div>
    </nuxeo-dialog>
  </template>
  <script>
    Polymer({
      is: 'nuxeo-easyshare-share-link',
      behaviors: [Nuxeo.I18nBehavior],
      properties: {
        /**
         * Input document.
         */
        document: {
          type: Object
        },

        /**
         * Icon to use (iconset_name:icon_name).
         */
        icon: {
          type: String,
          value: 'nuxeo:share'
        },

        /**
         * `true` if the action should display the label, `false` otherwise.
         */
        showLabel: {
          type: Boolean,
          value: false,
        },
      },

      _toggleDialog: function() {
        this.$.dialog.toggle();
        this.$.permalink.inputElement.inputElement.select();
      },

      _isAvailable: function(document) {
        return document;
      },

      _isEasyshare: function(document) {
        return document && document.type === 'EasyShareFolder';
      },

      _buildPermalink: function(document) {
        return document ? location.origin + location.pathname + '#!/doc/' + document.uid : '';
      },

      _buildEasysharelink: function(document) {
        var baseUrl = location.origin + this.$.nxcon.url;
        return document ? baseUrl + '/site/easyshare/' + this.document.uid : '';
      }
    });
  </script>
</dom-module>
