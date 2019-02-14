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
`nuxeo-document-comment-thread`
@group Nuxeo UI
@element nuxeo-document-comment-thread
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
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
import './nuxeo-document-comment.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      .main-option {
        height: 1.5em;
        width: 1.5em;
        cursor: pointer;
        opacity: 0.5;
      }

      .more-content {
        color: var(--nuxeo-secondary-color, #1f28bf);
        cursor: pointer;
        font-size: 0.86em;

        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      .reply-area {
        margin: 5px 0;

        @apply --layout-horizontal;
        @apply --layout-end;
      }

      paper-textarea {
        width: 100%;
        --paper-input-container-input: {
          font-size: 1em;
          line-height: var(--nuxeo-comment-line-height, 20px);
        };

        --paper-input-container-color: var(--secondary-text-color, #939caa);

        --iron-autogrow-textarea-placeholder: {
          color: var(--secondary-text-color, #939caa);
          font-size: 0.86em;
        };
      }

    </style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>
    <nuxeo-resource id="commentRequest"></nuxeo-resource>

    <array-selector id="selector" items="{{comments}}" selected="{{selectedComment}}"></array-selector>

    <template is="dom-if" if="[[_moreAvailable(comments.length, total, allCommentsLoaded)]]">
      <span class="more-content" on-tap="_loadMore">[[_computeTextLabel(level, 'loadAll', total, i18n)]]</span>
    </template>
    <template id="commentList" is="dom-repeat" items="[[comments]]" as="comment">
      <nuxeo-document-comment comment="{{comment}}" level="[[level]]">
      </nuxeo-document-comment>
    </template>

    <template is="dom-if" if="[[_allowReplies(level)]]">
      <div class="reply-area">
        <paper-textarea id="replyContainer" placeholder="[[_computeTextLabel(level, 'writePlaceholder', null, i18n)]]" value="{{reply}}" max-rows="[[_computeMaxRows()]]" no-label-float="" on-keydown="_checkForEnter">
        </paper-textarea>
        <template is="dom-if" if="[[!_isBlank(reply)]]">
          <iron-icon id="submit" name="submit" class="main-option" icon="check" on-tap="_submitReply"></iron-icon>
          <nuxeo-tooltip for="submit">[[i18n('comments.submit.tooltip')]]</nuxeo-tooltip>
          <iron-icon name="clear" class="main-option" icon="clear" on-tap="_clearReply"></iron-icon>
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
      value: function() {
        return [];
      }
    },

    level: {
      type: Number,
      value: 1,
    },

    reply: {
      type: String,
      value: '',
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

  connectedCallback : function() {
    this.addEventListener('delete-comment', this._handleDeleteEvent);
    this.addEventListener('edit-comment', this._handleEditEvent);
    this.addEventListener('comments-changed', this._handleCommentsChange);
  },

  disconnectedCallback: function() {
    this.removeEventListener('delete-comment', this._handleDeleteEvent);
    this.removeEventListener('edit-comment', this._handleEditEvent);
    this.removeEventListener('comments-changed', this._handleCommentsChange);
  },

  focusInput: function() {
    this.$$('#replyContainer').focus();
  },

  _checkForEnter: function(e) {
    if (e.keyCode === 13 && e.ctrlKey) {
      if(!this._isBlank(this.reply)) {
        this._submitReply();
      }
    }
  },

  _clearReply: function() {
    this.$.selector.clearSelection();
    this.set('reply', '');
  },

  _clearRequest: function() {
    this.$.commentRequest.data = {};
    this.$.commentRequest.headers = {};
    this.$.commentRequest.params = {};
  },

  _fetchComments: function(loadAll) {
    this._clearRequest();
    this.$.commentRequest.path = this._computeResourcePath();
    this.$.commentRequest.params = {
      pageSize: loadAll ? 0 : this.pageSize,
      currentPageIndex: 0,
    };
    this.$.commentRequest.headers = {
      'X-NXfetch.comment': 'repliesSummary'
    };
    this.$.commentRequest.get()
      .then(function (response) {
        /* Reconciliation of local and server comments */
        var olderComment = this.comments.length > 0 ? this.comments[0] : null;
        var newComments = response.entries;
        while (newComments.length > 0 && !!olderComment
        && (newComments[0].creationDate > olderComment.creationDate || newComments[0].id === olderComment.id)) {
          newComments.shift();
        }
        response.entries.forEach(function (entry) {
          this.unshift('comments', entry);
        }.bind(this));
        this._setTotal(response.totalSize);
        this._setAllCommentsLoaded(!!loadAll);
      }.bind(this))
      .catch(function (error) {
        if (error.status === 404) {
          this.fire('notify', {message: this._computeTextLabel(this.level, 'notFound')});
        } else {
          this.fire('notify', {message: this._computeTextLabel(this.level, 'fetch.error')});
          throw error;
        }
      }.bind(this));
  },

  _getCommentIndexById: function(commentId) {
    return this.comments.findIndex(function (entry) {
      return entry.id === commentId;
    });
  },

  _handleCommentsChange: function(event) {
    if (event.detail.path === 'comments.length') {
      this.fire('number-of-replies', {total: this.comments.length});
    }
  },

  _handleDeleteEvent: function(event) {
    var index = this._getCommentIndexById(event.detail.commentId);
    if (index !== -1) {
      this._clearRequest();
      this.$.commentRequest.path = this._computeResourcePath(this.comments[index].id);
      this.$.commentRequest.remove()
        .then(function () {
          this.splice('comments', index, 1);
          this._setTotal(this.total - 1);
        }.bind(this))
        .catch(function (error) {
          if (error.status === 404) {
            this.fire('notify', {message: this._computeTextLabel(this.level, 'notFound')});
          } else {
            this.fire('notify', {message: this._computeTextLabel(this.level, 'deletion.error')});
            throw error;
          }
        }.bind(this));
      event.stopPropagation();
    }
  },

  _handleEditEvent: function(event) {
    var index = this._getCommentIndexById(event.detail.commentId);
    if (index !== -1) {
      var comment = this.comments[index];
      this.$.commentList.itemForElement(comment);
      this.$.selector.select(comment);
      this.set('reply', comment.text);
      this.$$('#replyContainer').focus();
    }
    event.stopPropagation();
  },

  _loadMore: function() {
    this._fetchComments(true);
  },

  _refresh: function() {
    this._fetchComments(this.allCommentsLoaded);
  },

  _submitReply: function(e) {
    if (e) {
      e.preventDefault();
    }
    this._clearRequest();
    this.$.commentRequest.path = this._computeResourcePath(this.selectedComment ? this.selectedComment.id : null);
    this.$.commentRequest.data = {
      'entity-type': 'comment',
      parentId: this.uid,
      author: this.selectedComment ? this.selectedComment.author : this.currentUser.properties.username,
      text: this.reply.trim()
    };

    if (this.selectedComment) {
      this.$.commentRequest.put()
        .then(function (response){
          var index = this._getCommentIndexById(this.selectedComment.id);
          if (index !== -1) {
            this.set('comments.' + index + '.modificationDate', response.modificationDate);
            this.set('comments.' + index + '.text', response.text);
          }
          this._clearReply();
        }.bind(this))
        .catch(function (error){
          if (error.status === 404) {
            this.fire('notify', {message: this._computeTextLabel(this.level, 'notFound')});
          } else {
            this.fire('notify', {message: this._computeTextLabel(this.level, 'edition.error')});
            throw error;
          }
        }.bind(this));
    } else {
      this.$.commentRequest.post()
        .then(function (response) {
          this._clearReply();
          this.push('comments', response);
          this._setTotal(this.total + 1);
        }.bind(this))
        .catch(function (error) {
          if (error.status === 404) {
            this.fire('notify', {message: this._computeTextLabel(this.level, 'notFound')});
          } else {
            this.fire('notify', {message: this._computeTextLabel(this.level, 'creation.error')});
            throw error;
          }
        }.bind(this));
    }
  },

  _computeMaxRows: function() {
    var lineHeight = parseFloat(this.getComputedStyleValue('--nuxeo-comment-line-height'));
    var maxHeight = parseFloat(this.getComputedStyleValue('--nuxeo-comment-max-height'));
    return Math.round( (isNaN(maxHeight) ? 80 : maxHeight) / (isNaN(lineHeight) ? 20 : lineHeight) );
  },

  _computeResourcePath: function(commentId) {
    return "/id/" + this.uid + "/@comment/" + (commentId ? commentId : '');
  },

  _computeSubLevel: function(level) {
    return level + 1;
  },

  _computeTextLabel: function(level, option, placeholder) {
    return level === 1 ? this.i18n('comments.' + option + '.comment', placeholder)
      : this.i18n('comments.' + option + '.reply', placeholder);
  },

  /** Visibility Methods **/
  _allowReplies: function(level) {
    return level <= 2;
  },

  _isBlank: function(reply) {
    return !reply || typeof reply !== 'string' || reply.trim().length === 0;
  },

  _moreAvailable: function(length, total, allCommentsLoaded) {
    return length < total && !allCommentsLoaded;
  }
});
