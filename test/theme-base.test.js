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
import { fixture, html } from '@nuxeo/testing-helpers';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html as polymerHtml } from '@polymer/polymer/lib/utils/html-tag.js';
import '../themes/base.js';

// Widgets such as nuxeo-input render their label in a shadow root and style it with --nuxeo-label,
// so this fixture stands in for any form field label in the Create / Import layouts.
Polymer({
  is: 'nuxeo-label-spacing-fixture',
  _template: polymerHtml`
    <style include="nuxeo-styles"></style>
    <label id="label">Last Contributor</label>
  `,
});

suite('themes/base', () => {
  suite('WCAG 2.1 SC 1.4.12 text spacing', () => {
    let userStyle;

    teardown(() => {
      if (userStyle) {
        userStyle.remove();
        userStyle = null;
      }
    });

    test('a label styled with nuxeo-styles inherits the ambient letter spacing', async () => {
      const host = await fixture(html`
        <div style="letter-spacing: 3px">
          <nuxeo-label-spacing-fixture></nuxeo-label-spacing-fixture>
        </div>
      `);
      const { label } = host.querySelector('nuxeo-label-spacing-fixture').$;
      expect(getComputedStyle(label).letterSpacing).to.equal('3px');
    });

    test('a user text-spacing stylesheet reaches labels inside shadow roots', async () => {
      // A user stylesheet can only match elements in the main document, so labels must not pin
      // their own spacing — otherwise SC 1.4.12 can never be satisfied.
      userStyle = document.createElement('style');
      userStyle.textContent = '.a11y-text-spacing { letter-spacing: 0.12em !important; }';
      document.head.appendChild(userStyle);

      const host = await fixture(html`
        <div class="a11y-text-spacing">
          <nuxeo-label-spacing-fixture></nuxeo-label-spacing-fixture>
        </div>
      `);
      const { label } = host.querySelector('nuxeo-label-spacing-fixture').$;
      const style = getComputedStyle(label);
      expect(parseFloat(style.letterSpacing)).to.be.closeTo(0.12 * parseFloat(style.fontSize), 0.05);
    });
  });
});
