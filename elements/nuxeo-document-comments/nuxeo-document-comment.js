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

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
// eslint-disable-next-line import/no-cycle
import './nuxeo-document-comment-thread.js';
import './nuxeo-document-comments-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

/**
`nuxeo-document-comment`
@group Nuxeo UI
@element nuxeo-document-comment
*/
Polymer({
  _template: html`
    <style include="nuxeo-document-comments-styles">
      :host {
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

      .info {
        margin-left: 10px;
        @apply --layout-vertical;
        @apply --layout-flex;
      }

      .separator {
        margin: 0 5px;
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
        }
      }

      paper-listbox {
        --paper-listbox: {
          padding: 0;
        }
      }

      paper-icon-button {
        opacity: 0;
        --paper-icon-button: {
          padding: 0;
        }
      }

      paper-icon-item {
        --paper-icon-item: {
          padding: 5px 5px;
          display: flex;
          cursor: pointer;
        }

        --paper-item-min-height: 24px;

        --paper-item-icon: {
          width: 1.75em;
          margin-right: 10px;
        }

        --paper-item-selected-weight: normal;

        --paper-item-focused-before: {
          background-color: transparent;
        }
      }
    </style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>
    <nuxeo-resource id="commentRequest" path="/id/[[comment.parentId]]/@comment/[[comment.id]]"></nuxeo-resource>

    <nuxeo-dialog id="dialog" with-backdrop>
      <h2>[[i18n('comments.deletion.dialog.heading')]]</h2>
      <div>[[_computeConfirmationLabel(comment.numberOfReplies)]]</div>
      <div class="buttons">
        <paper-button name="dismiss" dialog-dismiss>[[i18n('comments.deletion.dialog.buttons.cancel')]]</paper-button>
        <paper-button name="confirm" dialog-confirm on-click="_deleteComment"
          >[[i18n('comments.deletion.dialog.buttons.delete')]]</paper-button
        >
      </div>
    </nuxeo-dialog>

    <div class="horizontal">
      <nuxeo-user-avatar
        user="[[comment.author]]"
        height="[[_computeAvatarDimensions(level)]]"
        width="[[_computeAvatarDimensions(level)]]"
        border-radius="50"
        font-size="[[_computeAvatarFontSize(level)]]"
      >
      </nuxeo-user-avatar>
      <div class="info">
        <div id="body">
          <div class="horizontal">
            <span class="author">[[comment.author]]</span>
            <span class="smaller opaque"
              >[[_computeDateLabel(comment, comment.creationDate, comment.modificationDate, i18n)]]</span
            >
            <template is="dom-if" if="[[_areExtendedOptionsAvailable(comment.author, currentUser)]]">
              <paper-menu-button id="options" no-animations close-on-activate>
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
          <template is="dom-if" if="[[!editing]]">
            <div class="text">
              <span inner-h-t-m-l="[[_computeTextToDisplay(comment.text, maxChars, truncated)]]"></span>
              <template is="dom-if" if="[[truncated]]">
                <span class="smaller opaque pointer" on-tap="_showFullComment">[[i18n('comments.showAll')]]</span>
              </template>
              <template is="dom-if" if="[[!truncated]]">
                <iron-icon
                  name="reply"
                  class="main-option opaque"
                  icon="reply"
                  on-tap="_reply"
                  hidden$="[[!_isRootElement(level)]]"
                ></iron-icon>
              </template>
            </div>
          </template>
          <template is="dom-if" if="[[editing]]">
            <div class="input-area">
              <paper-textarea
                id="inputContainer"
                placeholder="[[_computeTextLabel(level, 'writePlaceholder', null, i18n)]]"
                value="{{text}}"
                max-rows="[[_computeMaxRows()]]"
                no-label-float
                on-keydown="_checkForEnter"
              >
              </paper-textarea>
              <template is="dom-if" if="[[!_isBlank(text)]]">
                <iron-icon
                  id="submit"
                  name="submit"
                  class="main-option opaque"
                  icon="check"
                  on-tap="_submitComment"
                ></iron-icon>
                <nuxeo-tooltip for="submit">[[i18n('comments.submit.tooltip')]]</nuxeo-tooltip>
                <iron-icon name="clear" class="main-option opaque" icon="clear" on-tap="_clearInput"></iron-icon>
              </template>
            </div>
          </template>
          <template is="dom-if" if="[[_isSummaryVisible(comment.expanded, comment.numberOfReplies)]]">
            <div id="summary" class="horizontal smaller">
              <span class="more-content pointer no-selection" on-tap="_expand"
                >[[i18n('comments.numberOfReplies', comment.numberOfReplies)]]</span
              >
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
      computed: '_computeTruncatedFlag(comment.showFull, comment.text,  maxChars)',
    },

    maxChars: {
      type: Number,
      readOnly: true,
      value: 256,
    },

    editing: {
      type: Boolean,
      readOnly: true,
      value: false,
    },
  },

  connectedCallback() {
    this.addEventListener('number-of-replies', this._handleRepliesChange);
    this.text = this.comment && this.comment.text;
  },

  disconnectedCallback() {
    this.removeEventListener('number-of-replies', this._handleRepliesChange);
  },

  _checkForEnter(e) {
    if (e.keyCode === 13 && e.ctrlKey) {
      if (!this._isBlank(this.comment.text)) {
        this._submitComment();
      }
    }
  },

  _clearInput() {
    this._setEditing(false);
    this.text = this.comment.text;
  },

  _deleteComment() {
    this.$.commentRequest.data = {};
    this.$.commentRequest
      .remove()
      .then(() => {
        this.fire('delete-comment', { commentId: this.comment.id });
      })
      .catch((error) => {
        if (error.status === 404) {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'notFound') });
        } else {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'deletion.error') });
          throw error;
        }
      });
  },

  _editComment() {
    this._setEditing(true);
    afterNextRender(this, function() {
      this.$$('#inputContainer').focus();
    });
  },

  _expand() {
    this.set('comment.expanded', true);
  },

  _handleRepliesChange(event) {
    const numberOfReplies = event.detail.total;
    if (numberOfReplies === 0) {
      this.set('comment.expanded', false);
    }
    this.set('comment.numberOfReplies', numberOfReplies);
    event.stopPropagation();
  },

  _reply() {
    if (!this.comment.expanded) {
      this._expand();
    }
    afterNextRender(this, function() {
      this.$$('#thread').focusInput();
    });
  },

  _showFullComment() {
    this.set('comment.showFull', true);
  },

  _submitComment(e) {
    if (e) {
      e.preventDefault();
    }
    this.$.commentRequest.data = {
      'entity-type': 'comment',
      parentId: this.comment.parentId,
      text: this.$$('#inputContainer').value.trim(),
    };

    this.$.commentRequest
      .put()
      .then((response) => {
        this.fire('edit-comment', {
          commentId: this.comment.id,
          modificationDate: response.modificationDate,
          text: response.text,
        });
        this.text = response.text;
        this._clearInput();
      })
      .catch((error) => {
        if (error.status === 404) {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'notFound') });
        } else {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'edition.error') });
          throw error;
        }
      });
  },

  _toggleDeletionConfirmation() {
    this.$.dialog.toggle();
  },

  _computeAvatarDimensions(level) {
    return this._isRootElement(level) ? 24 : 20;
  },

  _computeAvatarFontSize(level) {
    return this._isRootElement(level) ? 13 : 11;
  },

  _computeConfirmationLabel(replies) {
    return this.i18n(`comments.deletion.dialog.message.${replies > 0 ? 'withReplies' : 'withoutReplies'}`);
  },

  _computeDateLabel(item, option) {
    if (item) {
      let date = this.formatDate(item.creationDate, 'relative');
      if (option === 'lastReplyDate') {
        date = this.formatDate(item.lastReplyDate, 'relative');
        return this.i18n('comments.lastReply', date);
      }
      if (item.modificationDate) {
        return this.i18n('comments.edited', date);
      }
      return date;
    }
  },

  _computeMaxRows() {
    const lineHeight = parseFloat(this.getComputedStyleValue('--nuxeo-comment-line-height'));
    const maxHeight = parseFloat(this.getComputedStyleValue('--nuxeo-comment-max-height'));
    return Math.round((Number.isNaN(maxHeight) ? 80 : maxHeight) / (Number.isNaN(lineHeight) ? 20 : lineHeight));
  },

  _computeSubLevel(level) {
    return level + 1;
  },

  _computeTextLabel(level, option, placeholder) {
    return level === 1
      ? this.i18n(`comments.${option}.comment`, placeholder)
      : this.i18n(`comments.${option}.reply`, placeholder);
  },

  _computeTextToDisplay(text, maxChars, truncated) {
    let parsedText = text;
    if (truncated) {
      parsedText = `${text.substring(0, maxChars - 1)}…`;
    }
    return parsedText;
  },

  _computeTruncatedFlag(showFull, text, limit) {
    return !showFull && text.length > limit;
  },

  /** Visibility Methods * */

  _areExtendedOptionsAvailable(author, currentUser) {
    return currentUser && (currentUser.properties.username === author || currentUser.isAdministrator);
  },

  _isBlank(text) {
    return !text || typeof text !== 'string' || text.trim().length === 0;
  },

  _isRootElement(level) {
    return level === 1;
  },

  _isSummaryVisible(expanded, total) {
    return !expanded && total > 0;
  },
});
