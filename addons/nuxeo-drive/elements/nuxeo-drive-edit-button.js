/**
(C) Copyright 2016 Nuxeo SA (http://nuxeo.com/) and others.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
  Nelson Silva <nsilva@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';

/**
`nuxeo-drive-edit-button`
@group Nuxeo UI
@element nuxeo-drive-edit-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-resource id="token" path="/token" params='{"application": "Nuxeo Drive"}'></nuxeo-resource>

    <template is="dom-if" if="[[_isAvailable(document,blob)]]">
      <div class="action" on-tap="_go">
        <paper-icon-button noink icon="icons:open-in-new" id="driveBtn"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[i18n('driveEditButton.tooltip')]]</span>
      </div>
      <paper-tooltip for="driveBtn">[[i18n('driveEditButton.tooltip')]]</paper-tooltip>
    </template>

    <nuxeo-dialog id="dialog" with-backdrop>
      <div class="vertical layout">
        <h1>[[i18n('driveEditButton.dialog.heading')]]</h1>
        <nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>
      </div>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('command.close')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-drive-edit-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    user: Object,
    document: Object,
    blob: Object,
    /**
      * `true` if the action should display the label, `false` otherwise.
      */
    showLabel: {
      type: Boolean,
      reflectToAttribute: true,
      value: false,
    },
  },

  _isAvailable(doc, blob) {
    return doc && blob && this.hasPermission(doc, 'Write') && (!blob.appLinks || blob.appLinks.length === 0);
  },

  _go() {
    this.$.token.get().then((response) => {
      const tokens = response.entries.map((token) => token.id);
      if (!tokens || !tokens.length) {
        this.$.dialog.toggle();
        return;
      }
      window.open(this.driveEditURL, '_top');
    });

  },

  get driveEditURL() {
    if (!this.blob) {
      return '';
    }

    const parts = this.blob.data.split('/nxfile/');
    const baseUrl = parts[0];
    const downloadUrl = `nxfile/${  parts[1]}`;

    return [
      'nxdrive://edit',
      baseUrl.replace('://', '/'), // XXX replaceFirst
      'user', this.user.id,
      'repo', this.document.repository,
      'nxdocid', this.document.uid,
      'filename', encodeURIComponent(this.blob.name),
      'downloadUrl', downloadUrl].join('/');
  },
});
