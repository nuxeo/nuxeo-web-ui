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

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-highlights`
@group Nuxeo UI
@element nuxeo-document-highlights
*/
Polymer({
  _template: html`
    <style>
      .category {
        opacity: 0.7;
        text-transform: uppercase;
        font-size: 0.75rem;
        padding-right: 0.5rem;
      }

      .segment em {
        color: var(--nuxeo-result-highlight, #0066cc);
        font-weight: bold;
        font-style: normal;
        border-bottom: 1px solid var(--nuxeo-result-highlight, #0066cc);
      }

      .segment + .segment::before {
        display: inline-block;
        content: '...';
      }
    </style>

    <div class="highlights" id="highlights">
      <template is="dom-repeat" items="[[highlights]]" as="highlight">
        <div class="highlight">
          <span class="category">[[_highlightFieldLabel(highlight)]]</span>
          <span class="segments">
            <template is="dom-repeat" items="[[highlight.segments]]" as="segment">
              <span class="segment">
                <template is="dom-repeat" items="[[_segmentOc(segment)]]" as="segmentOc">
                  [[_preSegment(segmentOc)]]
                  <em>
                    [[_segment(segmentOc)]]
                  </em>
                  [[_postSegment(segmentOc)]]
                </template>
              </span>
            </template>
          </span>
          <div></div></div
      ></template>
    </div>
  `,

  is: 'nuxeo-document-highlights',
  behaviors: [I18nBehavior],

  properties: {
    highlights: {
      type: Array,
    },
  },

  _highlightFieldLabel(highlight) {
    return this.i18n(`searchResults.highlight.field.${highlight.field}`);
  },

  _preSegment(segment) {
    const soEmIdx = segment.indexOf('<em>');
    if (soEmIdx > -1) {
      return segment.substring(0, soEmIdx);
    }
    return segment;
  },

  _segment(segment) {
    const soEmIdx = segment.indexOf('<em>');
    const eoEmIdx = segment.indexOf('</em>');
    if (soEmIdx > -1 && eoEmIdx > -1) {
      return segment.substring(soEmIdx + 4, eoEmIdx);
    }
    return '';
  },

  _segmentOc(segment) {
    const segmentOc = [];
    segment.split('<em>').forEach((item, idx) => {
      segmentOc.push(idx > 0 ? `<em>${item}` : item);
    });
    return segmentOc;
  },

  _postSegment(segment) {
    const eoEmIdx = segment.indexOf('</em>');
    if (eoEmIdx > -1) {
      return segment.substring(eoEmIdx + 5, segment.length);
    }
    return '';
  },
});
