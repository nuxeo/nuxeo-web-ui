/**
(C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and others.
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
`nuxeo-3d-transmission-formats` lists the transmission formats of a 3D document (if available).
These formats can be downloaded individually or directly loaded into `nuxeo-3d-preview` elements on the page.

    <nuxeo-3d-transmission-formats></nuxeo-3d-transmission-formats>

Example - Load a ThreeD document:

    <nuxeo-3d-transmission-formats document="[[doc]]"></nuxeo-3d-transmission-formats>

@group Nuxeo 3D Elements
@element nuxeo-3d-transmission-formats
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

      .flex {
        font-size: 12px;
        margin: auto;
      }

      .format {
        display: inline-block;
        width: 100%;
      }

      .format-name {
        float: left;
        width: 25%;
      }

      .format-info {
        float: left;
        height: 100%;
        width: 65%;
      }

      .format-polygons {
        height: 50%;
        display: flex;
      }

      .format-textures {
        height: 50%;
        display: flex;
      }

      .format-buttons {
        float: left;
        width: 8%;
        display: flex;
      }

      .format-info-element {
        float: left;
      }
    </style>

    <p class="title">[[i18n('threeDViewLayout.transmissionFormats.heading')]]</p>
    <template is="dom-if" if="{{_hasItems(document.properties.threed:transmissionFormats)}}">
      <div class="transmission-formats">
        <template is="dom-repeat" items="[[document.properties.threed:transmissionFormats]]" as="format">
          <div class="format">
            <div class="format-name">
              <label class="layout flex-2">[[format.name]]</label>
            </div>
            <div class="format-info">
              <div class="format-polygons item">
                <iron-icon class="format-info-element" icon="image:details"></iron-icon>
                <span class="layout flex format-info-element">[[_getPolyInfo(format)]]</span>
                <template class="format-info-element" is="dom-if" if="{{format.info.geometry_lod_success}}">
                  <iron-icon icon="icons:done"></iron-icon>
                </template>
                <template class="format-info-element" is="dom-if" if="{{!format.info.geometry_lod_success}}">
                  <iron-icon icon="icons:warning"></iron-icon>
                </template>
                <span class="layout flex format-info-element"
                  >[[_getPolyNumber(format)]] [[i18n('threeDViewLayout.unit.polygons')]]</span
                >
              </div>
              <div class="format-textures item">
                <template is="dom-if" if="{{_hasTextures(format)}}">
                  <iron-icon class="format-info-element" icon="image:image"></iron-icon>
                  <span class="layout flex format-info-element">[[_getTexInfo(format)]]</span>
                  <template class="format-info-element" is="dom-if" if="{{format.info.texture_lod_success}}">
                    <iron-icon icon="icons:done"></iron-icon>
                  </template>
                  <template class="format-info-element" is="dom-if" if="{{!format.info.texture_lod_success}}">
                    <iron-icon icon="icons:warning"></iron-icon>
                  </template>
                  <span class="layout flex format-info-element">[[_getTexSize(format)]]</span>
                </template>
              </div>
            </div>
            <div class="format-buttons">
              <div>
                <paper-icon-button
                  icon="icons:visibility"
                  on-tap="_loadFormat"
                  noink
                  aria-labelledby="previewTooltip"
                ></paper-icon-button>
                <paper-tooltip id="previewTooltip"
                  >[[i18n('threeDViewLayout.transmissionFormats.preview')]]</paper-tooltip
                >
              </div>
              <div>
                <paper-icon-button
                  icon="icons:file-download"
                  on-tap="_downloadFormat"
                  noink
                  aria-labelledby="downloadTooltip"
                ></paper-icon-button>
                <paper-tooltip id="downloadTooltip"
                  >[[i18n('threeDViewLayout.transmissionFormats.download')]]</paper-tooltip
                >
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template is="dom-if" if="{{!_hasItems(document.properties.threed:transmissionFormats)}}">
      <p>[[i18n('threeDViewLayout.transmissionFormats.notAvailable')]]</p>
    </template>
  `,

  is: 'nuxeo-3d-transmission-formats',

  properties: {
    /**
     * The ThreeD `document` with (or without) transmission formats.
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

  _formatAsReadable(value, base, unit) {
    value = Number(value);
    if (value < base) {
      return `${value} ${unit}`;
    }
    const exp = parseInt(Math.log(value) / Math.log(base), 0);
    const pre = String('kMGTPE'.charAt(exp - 1));
    return `${Math.round((value / base ** exp) * 10) / 10} ${pre}${unit}`;
  },

  _getPolyInfo(f) {
    const perc = f.percPoly == null ? '' : `${f.percPoly} %`;
    const max = f.maxPoly == null ? '' : `< ${this._formatAsReadable(f.maxPoly, 1000, '')}`;
    return f.percPoly != null && f.maxPoly != null ? `${perc} | ${max}` : perc + max;
  },

  _getPolyNumber(f) {
    return this._formatAsReadable(f.info.polygons, 1000, '');
  },

  _hasTextures(f) {
    return f.info.textures_size > 0;
  },

  _getTexInfo(f) {
    const perc = f.percTex == null ? '' : `${f.percTex} %`;
    const max = f.maxTex == null ? '' : `< ${f.maxTex}`;
    return f.percTex != null && f.maxTex != null ? `${perc} | ${max}` : perc + max;
  },

  _getTexSize(f) {
    return this._hasTextures(f) ? this._formatAsReadable(f.info.textures_size, 1024, 'B') : null;
  },

  _loadFormat(e) {
    this.fire('3d-viewer-content-change', {
      content: e.model.format.content.data,
    });
  },

  _downloadFormat(e) {
    window.location.href = e.model.format.content.data;
  },
});
