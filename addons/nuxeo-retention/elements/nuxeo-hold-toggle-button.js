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
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';

/**
`nuxeo-hold-toggle-button`
@group Nuxeo UI
@element nuxeo-attach-rule-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles nuxeo-action-button-styles">
      :host([hold]) paper-icon-button {
        color: var(--icon-toggle-outline-color, var(--nuxeo-action-color-activated));
      }
    </style>

    <nuxeo-operation id="opHold" on-poll-start="_onHoldPollStart" on-response="_onHoldResponse"> </nuxeo-operation>
    <nuxeo-operation id="opUnhold" on-poll-start="_onUnholdPollStart" on-response="_onUnholdResponse">
    </nuxeo-operation>

    <dom-if if="[[_isAvailable(provider, document)]]">
      <template>
        <div class="action" on-click="_toggle">
          <paper-icon-button icon="[[icon]]" noink="" on-clock=""></paper-icon-button>
          <span class="label" hidden$="[[!showLabel]]">[[_label]]</span>
          <nuxeo-tooltip>[[tooltip]]</nuxeo-tooltip>
        </div>
      </template>
    </dom-if>

    <nuxeo-dialog id="dialog" with-backdrop="" on-iron-overlay-closed="_resetPopup" no-auto-focus="">
      <h2>[[i18n('retention.holdToggleButton.label.heading')]]</h2>
      <paper-dialog-scrollable>
        <nuxeo-textarea
          name="description"
          label="[[i18n('retention.holdToggleButton.label.description')]]"
          value="{{description}}"
        ></nuxeo-textarea>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button dialog-dismiss="">[[i18n('command.close')]]</paper-button>
        <paper-button name="hold" class="primary" on-tap="_hold">
          [[_label]]
        </paper-button>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-hold-toggle-button',
  behaviors: [FiltersBehavior, FormatBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
      observer: '_documentChanged',
    },

    /**
     * Icon to use (iconset_name:icon_name).
     */
    icon: {
      type: String,
      computed: '_computeIcon(hold)',
    },

    /**
     * Hold state.
     */
    hold: {
      type: Boolean,
      notify: true,
      reflectToAttribute: true,
      value: false,
    },

    /**
     * The translated label to be displayed by the action.
     */
    tooltip: {
      type: String,
      notify: true,
      computed: '_computeTooltip(hold, i18n)',
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
      computed: '_computeLabel(hold, i18n)',
    },

    /**
     * Page provider from which results are to be attached.
     */
    provider: {
      type: Object,
    },

    /**
     * Description to be set along with the hold.
     */
    description: String,
  },

  _isAvailable() {
    return this.provider || this.canSetLegalHold(this.document);
  },

  _hold() {
    if (this.provider) {
      this.$.opHold.op = 'Bulk.RunAction';
      this.$.opHold.input = this.provider;
      this.$.opHold.async = true;
      this.$.opHold.params = {
        action: 'holdDocumentsAction',
        parameters: JSON.stringify({ description: this.description }),
      };
      this.$.opHold.execute().then(() => {
        this._toggleDialog();
      });
    } else {
      this.$.opHold.op = 'Document.Hold';
      this.$.opHold.input = this.document;
      this.$.opHold.async = false;
      this.$.opHold.params = { description: this.description };
      this.$.opHold.execute().then(() => {
        this._toggleDialog();
        this.dispatchEvent(
          new CustomEvent('document-updated', {
            composed: true,
            bubbles: true,
          }),
        );
      });
    }
  },

  _unhold() {
    if (this.provider) {
      this.$.opUnhold.op = 'Bulk.RunAction';
      this.$.opUnhold.input = this.provider;
      this.$.opUnhold.async = true;
      this.$.opUnhold.params = {
        action: 'unholdDocumentsAction',
      };
      this.$.opUnhold.execute();
    } else {
      this.$.opUnhold.op = 'Document.Unhold';
      this.$.opUnhold.input = this.document;
      this.$.opUnhold.async = false;
      this.$.opUnhold.params = {};
      this.$.opUnhold.execute().then(() => {
        this.dispatchEvent(
          new CustomEvent('document-updated', {
            composed: true,
            bubbles: true,
          }),
        );
      });
    }
  },

  _toggle() {
    if (!this.hold) {
      this._toggleDialog();
    } else {
      this._unhold();
    }
  },

  _toggleDialog() {
    this._resetPopup();
    this.$.dialog.toggle();
  },

  _resetPopup() {
    this.set('description', null);
  },

  _computeTooltip(hold) {
    return this.i18n(`retention.holdToggleButton.tooltip.${hold ? 'unhold' : 'hold'}`);
  },

  _computeLabel(hold) {
    return this.i18n(`retention.holdToggleButton.tooltip.${hold ? 'unhold' : 'hold'}`);
  },

  _computeIcon(hold) {
    return hold ? 'nuxeo:hold' : 'nuxeo:unhold';
  },

  _documentChanged() {
    this.hold = !!(this.document && this.document.hasLegalHold);
  },

  _onHoldPollStart() {
    this.fire('notify', { message: this.i18n('retention.holdToggleButton.bulk.hold.poll') });
  },

  _onHoldResponse() {
    this.fire('notify', { message: this.i18n('retention.holdToggleButton.bulk.hold') });
    this.fire('refresh');
  },

  _onUnholdPollStart() {
    this.fire('notify', { message: this.i18n('retention.holdToggleButton.bulk.unhold.poll') });
  },

  _onUnholdResponse() {
    this.fire('notify', { message: this.i18n('retention.holdToggleButton.bulk.unhold') });
    this.fire('refresh');
  },
});
