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
`nuxeo-document-comment`
@group Nuxeo UI
@element nuxeo-document-comment
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-textarea.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import './nuxeo-document-comment-thread.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
        margin-top: 5px;
      }

      #body:hover paper-icon-button {
        opacity: 0.5;
        transition: opacity 100ms;
      }

      .author {
        font-weight: bold;
        margin-right: 5px;
      }

      .horizontal {
        @apply --layout-horizontal;
      }

      .info {
        margin-left: 10px;
        @apply --layout-vertical;
        @apply --layout-flex;
      }

      .link {
        cursor: pointer;
      }

      .main-option {
        height: 1.5em;
        width: 1.5em;
        cursor: pointer;
      }

      .more-content {
        color: var(--nuxeo-secondary-color, #1f28bf);
      }

      .no-selection {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      .opaque {
        opacity: 0.5;
      }

      .separator {
        margin: 0 5px;
      }

      .smaller {
        font-size: 0.86em;
      }

      .text {
        display: inline;
      }

      .text span {
        white-space: pre-wrap;
      }

      paper-menu-button {
        --paper-menu-button: {
          padding: 0;
        };
      }

      paper-listbox {
        --paper-listbox: {
          padding: 0;
        };
      }

      paper-icon-button {
        opacity: 0;
        --paper-icon-button: {
          padding: 0;
        };
      }

      paper-icon-item {
        --paper-icon-item: {
          padding: 5px 5px;
          display: flex;
          cursor: pointer;
        };

        --paper-item-min-height: 24px;

        --paper-item-icon: {
          width: 1.75em;
          margin-right: 10px;
        };

        --paper-item-selected-weight: normal;

        --paper-item-focused-before: {
          background-color: transparent;
        }
      }

    </style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>

    <nuxeo-dialog id="dialog" with-backdrop="">
      <h2>[[i18n('comments.deletion.dialog.heading')]]</h2>
      <div>[[_computeConfirmationLabel(comment.numberOfReplies)]]</div>
      <div class="buttons">
        <paper-button name="dismiss" dialog-dismiss="">[[i18n('comments.deletion.dialog.buttons.cancel')]]</paper-button>
        <paper-button name="confirm" dialog-confirm="" on-click="_deleteComment">[[i18n('comments.deletion.dialog.buttons.delete')]]</paper-button>
      </div>
    </nuxeo-dialog>

    <div class="horizontal">
      <nuxeo-user-avatar user="[[comment.author]]" height="[[_computeAvatarDimensions(level)]]" width="[[_computeAvatarDimensions(level)]]" border-radius="50" font-size="[[_computeAvatarFontSize(level)]]">
      </nuxeo-user-avatar>
      <div class="info">
        <div id="body">
          <div class="horizontal">
            <span class="author">[[comment.author]]</span>
            <span class="smaller opaque">[[_computeDateLabel(comment, comment.creationDate, comment.modificationDate, i18n)]]</span>
            <template is="dom-if" if="[[_areExtendedOptionsAvailable(comment.author, currentUser)]]">
              <paper-menu-button id="options" no-animations="" close-on-activate="">
                <paper-icon-button class="main-option" icon="more-vert" slot="dropdown-trigger" alt="menu">
                </paper-icon-button>
                <paper-listbox slot="dropdown-content">
                  <paper-icon-item name="edit" class="smaller no-selection" on-tap="_editComment">
                    <iron-icon icon="nuxeo:edit" slot="item-icon"></iron-icon>
                    <span>[[i18n('comments.options.edit')]]</span>
                  </paper-icon-item>
                  <paper-icon-item name="delete" class="smaller no-selection" on-tap="_toggleDeletionConfirmation">
                    <iron-icon icon="nuxeo:delete" slot="item-icon"></iron-icon>
                    <span>[[i18n('comments.options.delete')]]</span>
                  </paper-icon-item>
                </paper-listbox>
              </paper-menu-button>
            </template>
          </div>
          <div class="text">
            <span inner-h-t-m-l="[[_computeTextToDisplay(comment.text, maxChars, truncated)]]"></span>
            <template is="dom-if" if="[[truncated]]">
              <span class="smaller opaque link" on-tap="_showFullComment">[[i18n('comments.showAll')]]</span>
            </template>
            <template is="dom-if" if="[[!truncated]]">
              <iron-icon name="reply" class="main-option opaque" icon="reply" on-tap="_reply" hidden\$="[[!_isRootElement(level)]]"></iron-icon>
            </template>
          </div>
          <template is="dom-if" if="[[_isSummaryVisible(comment.expanded, comment.numberOfReplies)]]">
            <div id="summary" class="horizontal smaller">
              <span class="more-content link no-selection" on-tap="_expand">[[i18n('comments.numberOfReplies', comment.numberOfReplies)]]</span>
              <span class="separator opaque">•</span>
              <span class="opaque">[[_computeDateLabel(comment, 'lastReplyDate', comment.lastReplyDate, i18n)]]</span>
            </div>
          </template>
        </div>

        <template is="dom-if" if="[[comment.expanded]]">
          <nuxeo-document-comment-thread id="thread" uid="[[comment.id]]" level="[[_computeSubLevel(level)]]">
          </nuxeo-document-comment-thread>
        </template>
      </div>
    </div>
`,

  is: 'nuxeo-document-comment',
  behaviors: [FormatBehavior],

  properties: {
    comment: {
      type: Object,
    },

    level: {
      type: Number,
      value: 1,
    },

    truncated: {
      type: Boolean,
      computed: '_computeTruncatedFlag(comment.showFull, comment.text,  maxChars)'
    },

    maxChars: {
      type: Number,
      readOnly: true,
      value: 256,
    },
  },

  connectedCallback : function() {
    this.addEventListener('number-of-replies', this._handleRepliesChange);
  },

  disconnectedCallback: function() {
    this.removeEventListener('number-of-replies', this._handleRepliesChange);
  },

  _deleteComment: function() {
    this.fire('delete-comment', {commentId: this.comment.id});
  },

  _editComment: function() {
    this.fire('edit-comment', {commentId: this.comment.id});
  },

  _expand: function () {
    this.set('comment.expanded', true);
  },

  _handleRepliesChange: function(event) {
    var numberOfReplies = event.detail.total;
    if(numberOfReplies === 0) {
      this.set('comment.expanded', false);
    }
    this.set('comment.numberOfReplies', numberOfReplies);
    event.stopPropagation();
  },

  _showFullComment: function() {
    this.set('comment.showFull', true);
  },

  _reply: function() {
    if (!this.comment.expanded) {
      this._expand();
    }
    afterNextRender(this, function() {
      this.$$('#thread').focusInput();
    });
  },

  _toggleDeletionConfirmation: function() {
    this.$.dialog.toggle();
  },

  _computeAvatarDimensions: function(level) {
    return this._isRootElement(level) ? 24 : 20;
  },

  _computeAvatarFontSize: function(level) {
    return this._isRootElement(level) ? 13 : 11;
  },

  _computeConfirmationLabel: function (replies) {
    return this.i18n('comments.deletion.dialog.message.' + (replies > 0 ? 'withReplies' : 'withoutReplies'));
  },

  _computeDateLabel: function (item, option) {
    if (item) {
      var date = this.formatDate(item.creationDate, 'relative');
      if(option === 'lastReplyDate') {
        date = this.formatDate(item.lastReplyDate, 'relative');
        return this.i18n('comments.lastReply', date);
      } else if (item.modificationDate) {
        return this.i18n('comments.edited', date)
      }
      return date;
    }
  },

  _computeSubLevel: function (level) {
    return level + 1;
  },

  _computeTextToDisplay: function(text, maxChars, truncated) {
    var parsedText = text;
    if(truncated){
      parsedText = text.substring(0, maxChars - 1) + '…';
    }
    return parsedText;
  },

  _computeTruncatedFlag: function(showFull, text, limit) {
    return !showFull && text.length > limit;
  },

  /** Visibility Methods **/

  _areExtendedOptionsAvailable: function (author, currentUser) {
    return currentUser && (currentUser.properties.username === author || currentUser.isAdministrator);
  },

  _isRootElement: function (level) {
    return level === 1;
  },

  _isSummaryVisible: function (expanded, total) {
    return !expanded && total > 0;
  }
});
