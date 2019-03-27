/*
(C) Copyright 2018 Nuxeo (http://nuxeo.com/) and contributors.

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
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import './nuxeo-mail-icons.js';

/**
`nuxeo-mail-sync-button`
@group Nuxeo UI
@element nuxeo-mail-sync-button
*/
Polymer({
  _template: html`
    <nuxeo-operation-button
      operation="Mail.CheckInbox"
      input="[[document.uid]]"
      event="document-updated"
      notification="[[i18n('mailfolder.sync.success')]]"
      icon="nuxeo-mail:sync"
      label="[[i18n('mailfolder.sync')]]"
      on-tap="_showNotification"
    ></nuxeo-operation-button>

    <paper-toast id="toast" text="[[i18n('mailfolder.sync.checking')]]" duration="0"></paper-toast>
  `,

  is: 'nuxeo-mail-sync-button',
  behaviors: [I18nBehavior],

  properties: {
    /**
     * Input document
     */
    document: Object,
  },

  listeners: {
    'document-updated': '_closeNotification',
  },

  _showNotification() {
    this.$.toast.open();
  },

  _closeNotification() {
    this.$.toast.hide();
  },
});
