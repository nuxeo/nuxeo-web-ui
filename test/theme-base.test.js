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

// The theme is read as a static asset rather than imported: importing it would register the whole
// application theme in the shared test page and restyle every other suite.
function readTheme() {
  return fetch(new URL('../themes/base.js', import.meta.url)).then((response) => response.text());
}

function mixin(source, name) {
  const start = source.indexOf(`--${name}: {`);
  if (start === -1) {
    return null;
  }
  return source.slice(start, source.indexOf('}', start));
}

suite('themes/base.js', () => {
  suite('--nuxeo-label', () => {
    // WCAG 2.1 AA, SC 1.4.12 (Text Spacing): widget labels apply this mixin inside their shadow
    // roots, so an !important spacing declaration here outranks any user text-spacing stylesheet
    // and makes the spacing impossible to adjust. See WEBUI-501.
    test('Should not lock text spacing with !important', async () => {
      const label = mixin(await readTheme(), 'nuxeo-label');
      expect(label, 'the --nuxeo-label mixin should be defined').to.be.a('string');
      ['letter-spacing', 'word-spacing', 'line-height'].forEach((property) => {
        const declaration = new RegExp(`${property}\\s*:[^;]*!important`).exec(label);
        expect(declaration, `${property} must stay overridable by user stylesheets`).to.be.null;
      });
    });
  });
});
