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
import '../elements/nuxeo-themes/nuxeo-theme.js';

suite('nuxeo-theme', () => {
  suite('_image', () => {
    test('uses preview URL when preview is set', async () => {
      const el = await fixture(html`<nuxeo-theme name="dark" preview="/custom.jpg"></nuxeo-theme>`);
      expect(el._image('dark')).to.equal('/custom.jpg');
    });

    test('uses themes folder when preview is not set', async () => {
      const el = await fixture(html`<nuxeo-theme name="kawaii"></nuxeo-theme>`);
      expect(el._image('kawaii')).to.equal('themes/kawaii/preview.jpg');
    });
  });

  suite('_label', () => {
    test('uses title when set', async () => {
      const el = await fixture(html`<nuxeo-theme name="ocean" title="Ocean"></nuxeo-theme>`);
      expect(el._label('ocean')).to.equal('Ocean');
    });

    test('falls back to i18n when title is not set', async () => {
      const el = await fixture(html`<nuxeo-theme name="default"></nuxeo-theme>`);
      const i18nStub = sinon.stub(el, 'i18n').callsFake((k) => k);
      expect(el._label('default')).to.equal('themes.default');
      i18nStub.restore();
    });
  });

  suite('_selected', () => {
    teardown(() => {
      if (localStorage.getItem.restore) {
        localStorage.getItem.restore();
      }
    });

    test('returns true when stored theme matches name', async () => {
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'ocean' : null));
      const el = await fixture(html`<nuxeo-theme name="ocean"></nuxeo-theme>`);
      expect(el._selected('ocean')).to.be.true;
    });

    test('returns false when stored theme differs from name', async () => {
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'ocean' : null));
      const el = await fixture(html`<nuxeo-theme name="default"></nuxeo-theme>`);
      expect(el._selected('default')).to.be.false;
    });

    test('treats default as selected when no theme in storage', async () => {
      sinon.stub(localStorage, 'getItem').callsFake(() => null);
      const el = await fixture(html`<nuxeo-theme name="default"></nuxeo-theme>`);
      expect(el._selected('default')).to.be.true;
    });

    test('returns false for non-default when no theme in storage', async () => {
      sinon.stub(localStorage, 'getItem').callsFake(() => null);
      const el = await fixture(html`<nuxeo-theme name="kawaii"></nuxeo-theme>`);
      expect(el._selected('kawaii')).to.be.false;
    });
  });

  suite('_button', () => {
    test('uses current i18n key when theme is selected', async () => {
      const lsStub = sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'dark' : null));
      const el = await fixture(html`<nuxeo-theme name="dark"></nuxeo-theme>`);
      const i18nStub = sinon.stub(el, 'i18n').callsFake((k) => k);
      expect(el._button('dark')).to.equal('themes.current');
      i18nStub.restore();
      lsStub.restore();
    });

    test('uses apply i18n key when theme is not selected', async () => {
      const lsStub = sinon.stub(localStorage, 'getItem').callsFake(() => null);
      const el = await fixture(html`<nuxeo-theme name="kawaii"></nuxeo-theme>`);
      const i18nStub = sinon.stub(el, 'i18n').callsFake((k) => k);
      expect(el._button('kawaii')).to.equal('themes.apply');
      i18nStub.restore();
      lsStub.restore();
    });
  });

  suite('_ariaLabel', () => {
    test('calls themes.apply.ariaLabel i18n key with theme label', async () => {
      const el = await fixture(html`<nuxeo-theme name="light"></nuxeo-theme>`);
      const i18nStub = sinon.stub(el, 'i18n').callsFake((k, ...args) => (args.length ? `${k}:${args[0]}` : k));
      expect(el._ariaLabel('light')).to.equal('themes.apply.ariaLabel:themes.light');
      i18nStub.restore();
    });

    test('uses custom title when set', async () => {
      const el = await fixture(html`<nuxeo-theme name="ocean" title="Ocean"></nuxeo-theme>`);
      const i18nStub = sinon.stub(el, 'i18n').callsFake((k, ...args) => (args.length ? `${k}:${args[0]}` : k));
      expect(el._ariaLabel('ocean')).to.equal('themes.apply.ariaLabel:Ocean');
      i18nStub.restore();
    });

    test('uses current.ariaLabel key when theme is selected', async () => {
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'dark' : null));
      const el = await fixture(html`<nuxeo-theme name="dark"></nuxeo-theme>`);
      const i18nStub = sinon.stub(el, 'i18n').callsFake((k, ...args) => (args.length ? `${k}:${args[0]}` : k));
      expect(el._ariaLabel('dark')).to.equal('themes.current.ariaLabel:themes.dark');
      i18nStub.restore();
      localStorage.getItem.restore();
    });
  });

  suite('aria-label on apply button', () => {
    teardown(() => {
      if (localStorage.getItem.restore) {
        localStorage.getItem.restore();
      }
    });

    test('apply button has aria-label attribute', async () => {
      sinon.stub(localStorage, 'getItem').callsFake(() => null);
      const el = await fixture(html`<nuxeo-theme name="light"></nuxeo-theme>`);
      const button = el.shadowRoot.querySelector('paper-button');
      expect(button.hasAttribute('aria-label')).to.be.true;
      expect(button.getAttribute('aria-label')).to.not.be.empty;
    });

    test('aria-label reflects _ariaLabel method result', async () => {
      sinon.stub(localStorage, 'getItem').callsFake(() => null);
      const el = await fixture(html`<nuxeo-theme name="light"></nuxeo-theme>`);
      const button = el.shadowRoot.querySelector('paper-button');
      expect(button.getAttribute('aria-label')).to.equal(el._ariaLabel('light'));
    });
  });

  suite('_apply', () => {
    teardown(() => {
      if (localStorage.setItem.restore) {
        localStorage.setItem.restore();
      }
    });

    test('persists theme and dispatches theme-changed', async () => {
      sinon.stub(localStorage, 'setItem');
      const el = await fixture(html`<nuxeo-theme name="light"></nuxeo-theme>`);
      const listener = sinon.spy();
      el.addEventListener('theme-changed', listener);
      el._apply();
      expect(localStorage.setItem).to.have.been.calledWith('theme', 'light');
      expect(listener).to.have.been.calledOnce;
      const [evt] = listener.firstCall.args;
      expect(evt.detail.theme).to.equal('light');
    });
  });
});
