/**
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

Contributors:
    Miguel Nixo <mnixo@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-3d-render-views` displays the render views of a 3D document (if available).
These views can be downloaded as image files. On tap events are used to trigger orientation changes in
`nuxeo-3d-preview` elements on the page.

    <nuxeo-3d-render-views></nuxeo-3d-render-views>

Example - Load a ThreeD document:

    <nuxeo-3d-render-views document="[[doc]]"></nuxeo-3d-render-views>

@group Nuxeo 3D Elements
@element nuxeo-3d-render-views
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      .title {
        color: #213f7d;
        font-size: 1.64rem;
      }

      .render-views {
        @apply --layout-horizontal;
        @apply --layout-wrap;
      }

      .render-views > .item {
        @apply --layout-vertical;
        @apply --layout-center;
      }

      .render-views > .item label {
        color: #999;
      }

      .render-views > .item img {
        width: 200px;
      }
    </style>

    <p class="title">[[i18n('threeDViewLayout.renderViews.heading')]]</p>
    <template is="dom-if" if="{{_hasItems(document.properties.threed:renderViews)}}">
      <div class="render-views">
        <template is="dom-repeat" items="[[document.properties.threed:renderViews]]" as="renderView">
          <div class="item">
            <img src="[[renderView.thumbnail.data]]" on-tap="_setCoords" alt$="[[document.title]]" />
            <div>
              <label class="layout flex-2" id="label">[[renderView.title]]</label>
              <paper-icon-button
                icon="icons:file-download"
                on-tap="_downloadView"
                noink
                aria-labelledby="label"
              ></paper-icon-button>
              <paper-tooltip>[[i18n('threeDViewLayout.renderViews.download')]]</paper-tooltip>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template is="dom-if" if="{{!_hasItems(document.properties.threed:renderViews)}}">
      <p>[[i18n('threeDViewLayout.renderViews.notAvailable')]]</p>
    </template>
  `,

  is: 'nuxeo-3d-render-views',

  properties: {
    /**
     * The ThreeD `document` with (or without) render views.
     */
    document: {
      type: Object,
      notify: true,
    },
  },

  behaviors: [I18nBehavior],

  _hasItems(list) {
    return list.length > 0;
  },

  _setCoords(e) {
    this.fire('3d-viewer-coords-change', {
      azimuth: e.model.renderView.azimuth,
      zenith: e.model.renderView.zenith,
    });
  },

  _downloadView(e) {
    window.location.href = e.model.renderView.content.data;
  },
});
