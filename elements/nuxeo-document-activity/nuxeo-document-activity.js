/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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

import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-activity`
@group Nuxeo UI
@element nuxeo-document-activity
*/
Polymer({
  _template: html`
    <style>
      .row {
        @apply --layout-horizontal;
      }

      .value {
        margin: 0 4px 7px;
      }

      .datetime {
        opacity: 0.7;
        margin-left: 3px;
      }
    </style>

    <template is="dom-repeat" items="[[activities]]">
      <div class="row">
        <nuxeo-user-tag user="[[item.principalName]]"></nuxeo-user-tag>
        <div class="value">
          <span>[[_activity(item)]]</span>
          <nuxeo-date class="datetime" datetime="[[item.eventDate]]" format="relative"></nuxeo-date>
        </div>
      </div>
    </template>
  `,

  is: 'nuxeo-document-activity',
  behaviors: [I18nBehavior, RoutingBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_documentChanged',
    },

    activities: {
      type: Array,
      value: [],
    },
  },

  _activity(event) {
    return this.i18n(
      `activity.${event.extended && event.extended.clientReason ? event.extended.clientReason : event.eventId}`,
    );
  },

  _documentChanged() {
    if (this.document && this.document.contextParameters && this.document.contextParameters.audit) {
      this.activities = this._gatherDuplicatedActivities(this.document.contextParameters.audit);
    }
  },

  /**
   * Returns a copy of the given array with "repeated" gathered
   */
  _gatherDuplicatedActivities(original) {
    const activities = original.slice();
    for (let i = 0; i < activities.length - 1; i++) {
      for (let j = i + 1; j < activities.length; j++) {
        if (this._areGatherableActivities(activities[i], activities[j])) {
          activities.splice(j, 1);
          j--; // After remove duplicated element, decrease j to keep same index
        }
      }
    }
    return activities;
  },

  /**
   * Checks if two given activities are "gatherable".
   * Activities are gatharable if they are both "download", have the same author
   * and have less than 24 hours between them.
   */
  _areGatherableActivities(a, b) {
    let delta = new Date(a.eventDate) - new Date(b.eventDate);
    delta = delta / 1000 / 60 / 60; // Converts ms to hours
    if (!a?.eventId || !a?.extended || !b?.eventId || !b?.extended) {
      return;
    }
    if (a.eventId === 'download' && !a.extended.clientReason) {
      a.extended.clientReason = 'download';
    }
    if (b.eventId === 'download' && !b.extended.clientReason) {
      b.extended.clientReason = 'download';
    }
    return !!(
      a.extended &&
      a.extended.clientReason &&
      b.extended &&
      b.extended.clientReason &&
      (a.extended.clientReason === 'view' || a.extended.clientReason === 'download') &&
      a.extended.clientReason === b.extended.clientReason &&
      a.principalName === b.principalName &&
      delta < 24
    );
  },
});
