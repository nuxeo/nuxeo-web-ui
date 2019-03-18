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

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-versions-diff-button`
@group Nuxeo UI
@element nuxeo-versions-diff-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <template is="dom-if" if="[[hasVersions(document)]]">
      <nuxeo-operation id="opGetVersions" op="Document.GetVersions" input="[[document.uid]]">
      </nuxeo-operation>
      <div class="action" on-tap="_doDiff">
        <paper-icon-button noink id="diff" icon="nuxeo:compare"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[_label]]</span>
      </div>
      <nuxeo-tooltip for="diff" position="[[tooltipPosition]]">[[_label]]</nuxeo-tooltip>
    </template>
`,

  is: 'nuxeo-versions-diff-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    document: {
      type: Object,
    },
    tooltipPosition: {
      type: String,
      value: 'bottom',
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
      computed: '_computeLabel(i18n)',
    },
  },

  _doDiff() {
    this.$$('#opGetVersions').execute().then((result) => {
      // sort the versions from the most to the least recent
      const versions = result.entries.reverse();
      const currentIndex = versions.findIndex((doc) => this._getMajor(doc) === this._getMajor(this.document) &&
               this._getMinor(doc) === this._getMinor(this.document));
      // and put the current one if the beginning of the list
      if (currentIndex > 0) {
        const current = versions[currentIndex];
        versions.splice(currentIndex, 1);
        versions.unshift(current);
      }
      if (this.document.isCheckedOut) {
        versions.unshift(this.document);
      }
      // check if there is at least two versions to be compared
      if (versions.length < 2) {
        this.fire('notify', { message: this.i18n('versionsDiffButton.nothingToCompare')} );
        return;
      }
      this.fire('nuxeo-diff-documents', {
        documents: versions,
      });
    });
  },

  _getMajor(document) {
    return document.properties['uid:major_version'];
  },

  _getMinor(document) {
    return document.properties['uid:minor_version'];
  },

  _computeLabel() {
    return this.i18n('versionsDiffButton.tooltip');
  },
});
