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
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { fixture, flush, html as fixtureHtml } from '@nuxeo/testing-helpers';
import '../elements/diff/nuxeo-diff-styles.js';

const PANE_WIDTH = 200;

// Stands in for nuxeo-default-diff and its siblings: they all include the shared stylesheet and
// render these spans inside a flex row, which is where a value's min-content width decides whether
// the compare pane can stay within its column.
Polymer({
  is: 'nuxeo-diff-styles-probe',
  _template: html`
    <style include="nuxeo-diff-styles">
      :host {
        display: block;
        /* Keep in sync with PANE_WIDTH; Polymer's html tag does not allow interpolation here. */
        width: 200px;
      }

      .row {
        display: flex;
      }
    </style>

    <div class="row">
      <div class="addition"><span class="added" id="added"></span></div>
    </div>
    <div class="row">
      <div class="deletion"><span class="deleted" id="deleted"></span></div>
    </div>
  `,
});

suite('nuxeo-diff-styles', () => {
  let element;

  setup(async () => {
    element = await fixture(fixtureHtml`<nuxeo-diff-styles-probe></nuxeo-diff-styles-probe>`);
    await flush();
  });

  ['added', 'deleted'].forEach((change) => {
    test(`an unbroken ${change} value stays inside the pane (WEBUI-1491)`, () => {
      const span = element.$[change];
      span.textContent = 'x'.repeat(300);
      // The geometric assertion is the one that matters: overflow-wrap: break-word would leave the
      // whole 300 characters as the min-content width of this flex item and push the value - and
      // with it the compare pane - well past the column.
      expect(span.getBoundingClientRect().width).to.be.at.most(PANE_WIDTH);
    });

    test(`an ordinary ${change} value is not chopped mid-word (WEBUI-1491)`, () => {
      const span = element.$[change];
      span.textContent = 'Revision 1 of the reconciliation report covering all European subsidiaries';
      const style = getComputedStyle(span);
      expect(style.wordBreak).to.equal('normal');
      expect(style.overflowWrap).to.equal('anywhere');
    });
  });
});
