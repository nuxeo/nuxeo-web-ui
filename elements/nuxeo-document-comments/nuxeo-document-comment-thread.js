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
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-avatar.js';
// eslint-disable-next-line import/no-cycle
import './nuxeo-document-comment.js';
import './nuxeo-document-comments-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-comment-thread`
@group Nuxeo UI
@element nuxeo-document-comment-thread
*/
Polymer({
  _template: html`
    <style include="nuxeo-document-comments-styles"></style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>
    <nuxeo-resource id="commentRequest" path="/id/[[uid]]/@comment/"></nuxeo-resource>

    <template is="dom-if" if="[[_moreAvailable(comments.length, total, allCommentsLoaded)]]">
      <span class="more-content no-selection pointer smaller" on-tap="_loadMore"
        >[[_computeTextLabel(level, 'loadAll', total, i18n)]]</span
      >
    </template>
    <template id="commentList" is="dom-repeat" items="[[comments]]" as="comment">
      <nuxeo-document-comment comment="{{comment}}" level="[[level]]"></nuxeo-document-comment>
    </template>

    <template is="dom-if" if="[[_allowReplies(level)]]">
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
  `,

  is: 'nuxeo-document-comment-thread',
  behaviors: [FormatBehavior],

  properties: {
    uid: {
      type: String,
      observer: '_refresh',
    },

    comments: {
      type: Array,
      value() {
        return [];
      },
    },

    level: {
      type: Number,
      value: 1,
    },

    pageSize: {
      type: Number,
      readOnly: true,
      value: 10,
    },

    allCommentsLoaded: {
      type: Boolean,
      readOnly: true,
      value: false,
    },

    total: {
      type: Number,
      readOnly: true,
      value: 0,
    },
  },

  connectedCallback() {
    this.addEventListener('delete-comment', this._handleDeleteEvent);
    this.addEventListener('edit-comment', this._handleEditEvent);
    this.addEventListener('comments-changed', this._handleCommentsChange);
  },

  disconnectedCallback() {
    this.removeEventListener('delete-comment', this._handleDeleteEvent);
    this.removeEventListener('edit-comment', this._handleEditEvent);
    this.removeEventListener('comments-changed', this._handleCommentsChange);
  },

  focusInput() {
    this.$$('#inputContainer').focus();
  },

  _checkForEnter(e) {
    if (e.keyCode === 13 && e.ctrlKey) {
      if (!this._isBlank(this.text)) {
        this._submitComment();
      }
    }
  },

  _clearInput() {
    this.text = '';
  },

  _clearRequest() {
    this.$.commentRequest.data = {};
    this.$.commentRequest.headers = {};
    this.$.commentRequest.params = {};
  },

  _fetchComments(loadAll) {
    this._clearRequest();
    this.$.commentRequest.params = {
      pageSize: loadAll ? 0 : this.pageSize,
      currentPageIndex: 0,
    };
    this.$.commentRequest.headers = {
      'fetch-comment': 'repliesSummary',
    };
    this.$.commentRequest
      .get()
      .then((response) => {
        /* Reconciliation of local and server comments */
        const olderComment = this.comments.length > 0 ? this.comments[0] : null;
        const newComments = response.entries;
        while (
          newComments.length > 0 &&
          !!olderComment &&
          (newComments[0].creationDate > olderComment.creationDate || newComments[0].id === olderComment.id)
        ) {
          newComments.shift();
        }
        response.entries.forEach((entry) => {
          this.unshift('comments', entry);
        });
        this._setTotal(response.totalSize);
        this._setAllCommentsLoaded(!!loadAll);
      })
      .catch((error) => {
        if (error.status === 404) {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'notFound') });
        } else {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'fetch.error') });
          throw error;
        }
      });
  },

  _getCommentIndexById(commentId) {
    return this.comments.findIndex((entry) => entry.id === commentId);
  },

  _handleCommentsChange(event) {
    if (event.detail.path === 'comments.length') {
      this.fire('number-of-replies', { total: this.comments.length });
    }
  },

  _handleDeleteEvent(event) {
    const index = this._getCommentIndexById(event.detail.commentId);
    if (index !== -1) {
      this.splice('comments', index, 1);
      this._setTotal(this.total - 1);
    }
    event.stopPropagation();
  },

  _handleEditEvent(event) {
    const index = this._getCommentIndexById(event.detail.commentId);
    if (index !== -1) {
      this.set(`comments.${index}.modificationDate`, event.detail.modificationDate);
      this.set(`comments.${index}.text`, event.detail.text);
    }
    event.stopPropagation();
  },

  _loadMore() {
    this._fetchComments(true);
  },

  _refresh() {
    this.set('comments', []);
    this._fetchComments(this.allCommentsLoaded);
  },

  _submitComment(e) {
    if (e) {
      e.preventDefault();
    }
    this._clearRequest();
    this.$.commentRequest.data = {
      'entity-type': 'comment',
      parentId: this.uid,
      text: this.text.trim(),
    };

    this.$.commentRequest
      .post()
      .then((response) => {
        this._clearInput();
        this.push('comments', response);
        this._setTotal(this.total + 1);
      })
      .catch((error) => {
        if (error.status === 404) {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'notFound') });
        } else {
          this.fire('notify', { message: this._computeTextLabel(this.level, 'creation.error') });
          throw error;
        }
      });
  },

  _computeMaxRows() {
    const lineHeight = parseFloat(this.getComputedStyleValue('--nuxeo-comment-line-height'));
    const maxHeight = parseFloat(this.getComputedStyleValue('--nuxeo-comment-max-height'));
    return Math.round((Number.isNaN(maxHeight) ? 80 : maxHeight) / (Number.isNaN(lineHeight) ? 20 : lineHeight));
  },

  _computeTextLabel(level, option, placeholder) {
    return level === 1
      ? this.i18n(`comments.${option}.comment`, placeholder)
      : this.i18n(`comments.${option}.reply`, placeholder);
  },

  /** Visibility Methods * */
  _allowReplies(level) {
    return level <= 2;
  },

  _isBlank(text) {
    return !text || typeof text !== 'string' || text.trim().length === 0;
  },

  _moreAvailable(length, total, allCommentsLoaded) {
    return length < total && !allCommentsLoaded;
  },
});
