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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import { setViewport } from '@web/test-runner-commands';
import '../elements/nuxeo-document-viewer/nuxeo-document-viewer.js';

suite('nuxeo-document-viewer', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-viewer></nuxeo-document-viewer>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(false);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
    sinon.stub(element, 'isProxy').returns(false);
    sinon.stub(element, 'isImmutable').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('_thumbnail', () => {
    test('should return thumbnail URL when available', () => {
      const doc = { uid: '1', contextParameters: { thumbnail: { url: 'http://example.com/thumb.jpg' } } };
      const result = element._thumbnail(doc);
      expect(result).to.include('http://example.com/thumb.jpg');
    });

    test('should return empty string when no thumbnail', () => {
      expect(element._thumbnail(null)).to.equal('');
    });
  });

  suite('_isDropzoneAvailable', () => {
    test('should return false when no WriteProperties permission', () => {
      const doc = { uid: '1' };
      element.hasPermission.returns(false);
      expect(element._isDropzoneAvailable(doc)).to.be.false;
    });

    test('should return false when document is trashed', () => {
      const doc = { uid: '1' };
      element.hasPermission.withArgs(doc, 'WriteProperties').returns(true);
      element.isTrashed.returns(true);
      expect(element._isDropzoneAvailable(doc)).to.be.false;
    });
  });

  // WEBUI-2314: the preview is a fraction of the viewport while the box it sits in tracks the
  // viewport one for one, so it is capped to what fits - but only in the side-by-side layout, and
  // never below a usable height. These assert the computed height at each of those boundaries.
  suite('responsive height cap', () => {
    const PREVIEW = 'iron-image, nuxeo-document-preview';
    // the uncapped expression, and the budget that actually fits
    const uncapped = (vh) => 0.8 * vh - 100;
    const fits = (vh, offsets = 0) => vh - 306 - offsets;

    const previewHeight = async () => {
      const probe = await fixture(html`<nuxeo-document-viewer></nuxeo-document-viewer>`);
      sinon.stub(probe, 'hasPermission').returns(false);
      // the thumbnail branch stamps iron-image, which carries the height under test
      probe.document = { uid: '1', properties: {} };
      await flush();
      const target = probe.shadowRoot.querySelector(PREVIEW);
      return target ? Math.round(parseFloat(getComputedStyle(target).height)) : null;
    };

    const setOffsets = (value) => {
      let style = document.getElementById('nx-app-offsets');
      if (!style) {
        style = document.createElement('style');
        style.id = 'nx-app-offsets';
        document.head.appendChild(style);
      }
      style.textContent = value
        ? `html{--nuxeo-app-top:${value} !important;--nuxeo-app-bottom:${value} !important;}`
        : '';
    };

    teardown(async () => {
      setOffsets(null);
      await setViewport({ width: 800, height: 600 });
    });

    test('caps the preview to what fits in the side-by-side layout', async () => {
      await setViewport({ width: 1400, height: 900 });
      const height = await previewHeight();
      // 900 is short enough that the fit budget is the smaller of the two
      expect(fits(900)).to.be.below(uncapped(900));
      expect(height).to.equal(Math.round(fits(900)));
    });

    test('leaves the preview alone where it already fits', async () => {
      await setViewport({ width: 1400, height: 1200 });
      const height = await previewHeight();
      expect(uncapped(1200)).to.be.below(fits(1200));
      expect(height).to.equal(Math.round(uncapped(1200)));
    });

    test('does not cap below the breakpoint, where the page stacks and scrolls', async () => {
      await setViewport({ width: 1024, height: 900 });
      const height = await previewHeight();
      expect(height).to.equal(Math.round(uncapped(900)));
    });

    test('does not collapse the preview on a wide but short viewport', async () => {
      // the fit budget goes negative here; without the floor the preview would clamp to zero
      await setViewport({ width: 1100, height: 300 });
      expect(fits(300)).to.be.below(0);
      const height = await previewHeight();
      expect(height).to.equal(Math.round(uncapped(300)));
      expect(height).to.be.above(0);
    });

    test('takes the app chrome offsets out of the fit budget', async () => {
      await setViewport({ width: 1400, height: 900 });
      setOffsets('40px');
      const height = await previewHeight();
      expect(height).to.equal(Math.round(fits(900, 80)));
    });
  });
});
