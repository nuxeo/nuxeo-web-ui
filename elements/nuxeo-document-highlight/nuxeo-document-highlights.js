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
`nuxeo-document-highlights`
@group Nuxeo UI
@element nuxeo-document-highlights
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      .category {
        opacity: .7;
        text-transform: uppercase;
        font-size: .75rem;
        padding-right: .5rem;
      }

      .segment em {
        color: var(--nuxeo-result-highlight, #0066CC);
        font-weight: bold;
        font-style: normal;
        border-bottom: 1px solid var(--nuxeo-result-highlight, #0066CC);
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
        <div>
      </div></div></template>
    </div>
`,

  is: 'nuxeo-document-highlights',
  behaviors: [I18nBehavior],

  properties: {
    highlights: {
      type: Array
    }
  },

  _highlightFieldLabel: function(highlight) {
    return this.i18n('searchResults.highlight.field.' + highlight.field);
  },

  _preSegment: function(segment) {
    var soEmIdx = segment.indexOf('<em>');
    if (soEmIdx > -1) {
      return segment.substring(0, soEmIdx);
    } else {
      return segment;
    }
  },

  _segment: function(segment) {
    var soEmIdx = segment.indexOf('<em>');
    var eoEmIdx = segment.indexOf('</em>');
    if (soEmIdx > -1 && eoEmIdx > -1) {
      return segment.substring(soEmIdx + 4, eoEmIdx);
    } else {
      return '';
    }
  },

  _segmentOc: function(segment) {
    var segmentOc = [];
    segment.split('<em>').forEach(function(item, idx) {
      segmentOc.push(idx > 0 ? '<em>' + item: item);
    });
    return segmentOc;
  },

  _postSegment: function(segment) {
    var eoEmIdx = segment.indexOf('</em>');
    if (eoEmIdx > -1) {
      return segment.substring(eoEmIdx + 5, segment.length);
    } else {
      return '';
    }
  }
});
