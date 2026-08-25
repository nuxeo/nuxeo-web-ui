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
const STYLES_ID = 'nuxeo-search-result-tooltip-styles';

/**
 * Styles the document name inside a search result's `nuxeo-tooltip`.
 *
 * `nuxeo-tooltip` clones its content into a `paper-tooltip` on `document.body`, so rules declared
 * in a consumer's shadow root never reach the rendered node and these have to live on the document.
 * The class name travels with the clone, which is what keeps this scoped to search results.
 *
 * `paper-tooltip` sizes itself to its content and only repositions when it does not fit, so without
 * a width cap a name with no break opportunity renders wider than the viewport with part of it
 * off-screen. The cap is relative as well as absolute so it still holds when the user zooms in.
 *
 * Idempotent: safe to call from every module that stamps one of these tooltips.
 */
export function ensureSearchResultTooltipStyles() {
  if (document.getElementById(STYLES_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `
    .nuxeo-search-result-tooltip-name {
      display: block;
      max-width: min(400px, 40vw);
      white-space: normal;
      overflow-wrap: break-word;
      line-height: 1.4;
      text-align: start;
    }
  `;
  document.head.appendChild(style);
}
