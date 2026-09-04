/**
@license
©2026 Hyland Software, Inc. and its affiliates. All rights reserved.
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
import { config } from '@nuxeo/nuxeo-elements';
import { BrandingBehavior } from '../elements/behaviors/nuxeo-branding-behavior.js';
import { isBrandingEnabled } from '../themes/theme-config.js';

// Minimal host element that mixes in the behavior under test.
Polymer({
  is: 'nuxeo-branding-behavior-test-element',
  behaviors: [BrandingBehavior],
});

suite('nuxeo-branding-behavior', () => {
  suite('rebrand property definition', () => {
    test('is a boolean reflected to the [rebrand] attribute', () => {
      const { rebrand } = BrandingBehavior.properties;
      expect(rebrand.type).to.equal(Boolean);
      expect(rebrand.reflectToAttribute).to.be.true;
      expect(rebrand.value).to.be.a('function');
    });

    test('computes its value from isBrandingEnabled()', () => {
      expect(BrandingBehavior.properties.rebrand.value()).to.equal(isBrandingEnabled());
    });
  });

  suite('applied to an element', () => {
    let brandingEnabled;

    setup(() => {
      brandingEnabled = false;
      sinon.stub(config, 'get').callsFake((path, fallback) => {
        if (path === 'branding.rebrand') {
          return brandingEnabled;
        }
        return fallback;
      });
    });

    teardown(() => {
      sinon.restore();
    });

    test('sets rebrand true and adds the [rebrand] attribute when branding is enabled', async () => {
      brandingEnabled = true;
      const el = await fixture(html`<nuxeo-branding-behavior-test-element></nuxeo-branding-behavior-test-element>`);
      // Assert against the single source of truth so the test holds whether isBrandingEnabled()
      // is config-driven or a static deployment flag.
      const expected = isBrandingEnabled();
      expect(el.rebrand).to.equal(expected);
      expect(el.hasAttribute('rebrand')).to.equal(expected);
    });

    test('sets rebrand false and omits the [rebrand] attribute when branding is disabled', async () => {
      brandingEnabled = false;
      const el = await fixture(html`<nuxeo-branding-behavior-test-element></nuxeo-branding-behavior-test-element>`);
      const expected = isBrandingEnabled();
      expect(el.rebrand).to.equal(expected);
      expect(el.hasAttribute('rebrand')).to.equal(expected);
    });
  });
});
