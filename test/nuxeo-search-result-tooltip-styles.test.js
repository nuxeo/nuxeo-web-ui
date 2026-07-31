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
import { ensureSearchResultTooltipStyles } from '../elements/search/nuxeo-search-result-tooltip-styles.js';

const STYLES_ID = 'nuxeo-search-result-tooltip-styles';

suite('nuxeo-search-result-tooltip-styles', () => {
  // Importing nuxeo-search-form.js injects these already, so start from a known state.
  setup(() => {
    const existing = document.getElementById(STYLES_ID);
    if (existing) {
      existing.remove();
    }
  });

  // Every test file shares one document, and nuxeo-search-form's own suite relies on these
  // styles being present, so hand the document back in the state its import leaves it in.
  teardown(() => {
    ensureSearchResultTooltipStyles();
  });

  test('injects the stylesheet on the document, where cloned tooltip content lives', () => {
    ensureSearchResultTooltipStyles();

    const style = document.getElementById(STYLES_ID);
    expect(style, 'injected stylesheet').to.not.be.null;
    expect(style.parentElement).to.equal(document.head);
    expect(style.textContent).to.contain('.nuxeo-search-result-tooltip-name');
  });

  test('is idempotent so repeated imports do not stack stylesheets', () => {
    ensureSearchResultTooltipStyles();
    const first = document.getElementById(STYLES_ID);

    // Exercises the early return.
    ensureSearchResultTooltipStyles();
    ensureSearchResultTooltipStyles();

    expect(document.querySelectorAll(`#${STYLES_ID}`).length).to.equal(1);
    expect(document.getElementById(STYLES_ID)).to.equal(first);
  });

  test('caps the width against both an absolute and a viewport-relative limit', () => {
    // The viewport-relative half is what keeps the cap correct when the user zooms in, since
    // zooming shrinks the CSS viewport while an absolute cap would stay put.
    ensureSearchResultTooltipStyles();

    const rules = document.getElementById(STYLES_ID).textContent;
    expect(rules).to.contain('max-width: min(400px, 40vw)');
  });

  test('lets a name with no break opportunity wrap instead of overflowing', () => {
    ensureSearchResultTooltipStyles();

    const rules = document.getElementById(STYLES_ID).textContent;
    expect(rules).to.contain('white-space: normal');
    expect(rules).to.contain('overflow-wrap: break-word');
    // A capped box only helps if the box is a block that the cap can apply to.
    expect(rules).to.contain('display: block');
  });
});
