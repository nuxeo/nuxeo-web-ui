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

// cache roots
let roots;

/**
`nuxeo-drive-sync-toggle-button`
@group Nuxeo UI
@element nuxeo-drive-sync-toggle-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      ::slotted(iron-icon:hover) {
        fill: var(--nuxeo-link-hover-color);
      }

      :host([synchronized]) ::slotted(iron-icon) {
        fill: var(--icon-toggle-pressed-color, --nuxeo-action-color-activated);
      }
    </style>

    <nuxeo-operation auto op="NuxeoDrive.GetRoots" on-response="_handleRoots"></nuxeo-operation>
    <nuxeo-operation id="op" op="NuxeoDrive.SetSynchronization" input="[[document.uid]]"></nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(document, synchronizationRoot)]]">
      <div class="action" on-tap="toggle">
        <paper-icon-button id="syncBut" icon="[[_icon(synchronized)]]"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[_label]]</span>
      </div>
      <paper-tooltip for="syncBut">[[_label]]</paper-tooltip>
    </template>
`,

  is: 'nuxeo-drive-sync-toggle-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_update',
    },
    synchronized: {
      type: Boolean,
      notify: true,
      reflectToAttribute: true,
    },
    synchronizationRoot: String,
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      reflectToAttribute: true,
      value: false,
    },
    _label: {
      type: String,
      computed: '_computeLabel(synchronized, i18n)',
    },
  },

  toggle() {
    const enable = !this.synchronized;
    this.$.op.params = {enable: !this.synchronized};
    return this.$.op.execute().then(() => {
      // update our root cache
      const idx = roots.indexOf(this.document.uid);
      if (enable && idx === -1) {
        roots.push(this.document.uid);
      } else if (!enable && idx !== -1) {
        roots.splice(idx, 1);
      }
      // as well as the status
      this.synchronized = enable;
    });
  },

  _isAvailable() {
    if (!this.document) {
      return false;
    }
    if (this.isVersion(this.document)) {
      return false;
    }
    const excludedDoctypes = ['Domain', 'SectionRoot', 'TemplateRoot', 'WorkspaceRoot', 'Forum', 'Collections'];
    const isExcluded = excludedDoctypes.indexOf(this.document.type) !== -1;
    const isFolder = this.document.facets.indexOf('Folderish') !== -1;
    const isSyncRootCandidate = isFolder && !this.isTrashed(this.document);
    return !isExcluded && isSyncRootCandidate && !this.synchronizationRoot;
  },

  _computeLabel(synchronized) {
    return synchronized ? this.i18n('driveSyncToggleButton.unsync','Unsynchronize')
                        : this.i18n('driveSyncToggleButton.sync','Synchronize');
  },

  _icon(synchronized) {
    return synchronized ? 'notification:sync-disabled' : 'notification:sync';
  },

  _update() {
    if (!this.document || !roots) {
      return;
    }
    this.synchronized = (roots.indexOf(this.document.uid) !== -1);

    // determine synchronization root (closest synchronized ancestor)
    const breadcrumb = this.document.contextParameters.breadcrumb.entries;
    for (let i = breadcrumb.length - 1; i >= 0; i--) {
      if (roots.indexOf(breadcrumb[i].parentRef) !== -1) {
        this.synchronizationRoot = breadcrumb[i].parentRef;
        return;
      }
    }
    this.synchronizationRoot = null;
  },

  _handleRoots(e) {
    roots = e.detail.response.entries.map((doc) => doc.uid);
    this._update();
  },
});
