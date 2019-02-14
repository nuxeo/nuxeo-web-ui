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
`nuxeo-collection-move-down-action`
@group Nuxeo UI
@element nuxeo-collection-move-down-action
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-operation op="Document.MoveCollectionMember" id="moveDownOp"></nuxeo-operation>

    <template id="availability" is="dom-if" if="[[_isAvailable(members)]]">
      <div class="action" on-tap="moveDown">
        <paper-icon-button noink="" id="downButton" icon="icons:arrow-downward"></paper-icon-button>
        <span class="label" hidden\$="[[!showLabel]]">[[_label]]</span>
      </div>
      <nuxeo-tooltip for="downButton" position="[[tooltipPosition]]">[[_label]]</nuxeo-tooltip>
    </template>
`,

  is: 'nuxeo-collection-move-down-action',
  behaviors: [I18nBehavior],

  properties: {
    members: {
      type: Object
    },
    allMembers: {
      type: Object
    },
    collection: {
      type: Object
    },
    tooltipPosition: {
      type: String,
      value: 'bottom'
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
      computed: '_computeLabel(i18n)'
    },
    _member1Idx: {
      type: Number
    },
    _member2Idx: {
      type: Number
    }
  },

  moveDown: function() {
    if (this.members && this.members.length === 1 && this.allMembers) {
      var member2 = this.members[0].uid;
      var i = 0;
      for (; i < this.allMembers.length; i++) {
        if (this.allMembers[i].uid === member2) {
          if (i < this.allMembers.length - 1) {
            this._member2Idx = i;
            this._member1Idx = i + 1;
            var member1 = this.allMembers[this._member1Idx].uid;
            this.$.moveDownOp.input = this.collection.uid;
            this.$.moveDownOp.params = {
              member1: member1,
              member2: member2
            };
            this.$.moveDownOp.execute().then(function() {
              this.allMembers[this._member2Idx] = this.allMembers.splice(this._member1Idx, 1,
                this.allMembers[this._member2Idx])[0];
              this.fire('refresh-display', {focusIndex: this._member1Idx});
            }.bind(this));
          }
          break;
        }
      }
    }
  },

  _isAvailable: function() {
    if (this.members && this.members.length === 1) {
      if (this.allMembers && this.allMembers.length <= 1) {
        return false;
      }
      if (this.allMembers[this.allMembers.length - 1].uid === this.members[0].uid) {
        return false;
      }
      return true;
    }
    return false;
  },

  _computeLabel: function() {
    return this.i18n('collections.moveDown');
  }
});
