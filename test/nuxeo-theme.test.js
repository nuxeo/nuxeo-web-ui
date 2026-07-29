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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import { config } from '@nuxeo/nuxeo-elements';
import '../elements/nuxeo-themes/nuxeo-theme.js';

suite('nuxeo-theme', () => {
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

  suite('hidden', () => {
    test('hides Hyland built-in cards when branding is off', async () => {
      brandingEnabled = false;
      const el = await fixture(html`<nuxeo-theme name="hyland-light"></nuxeo-theme>`);
      expect(el.hidden).to.be.true;
    });

    test('hides legacy built-in cards when branding is on', async () => {
      brandingEnabled = true;
      const el = await fixture(html`<nuxeo-theme name="default"></nuxeo-theme>`);
      expect(el.hidden).to.be.true;
    });

    test('never hides custom themes', async () => {
      brandingEnabled = true;
      const el = await fixture(html`<nuxeo-theme name="my-custom-theme"></nuxeo-theme>`);
      expect(el.hidden).to.be.false;
    });

    test('recomputes visibility when name changes after instantiation', async () => {
      brandingEnabled = false;
      const el = await fixture(html`<nuxeo-theme name="hyland-light"></nuxeo-theme>`);
      expect(el.hidden).to.be.true;
      el.name = 'default';
      await flush();
      expect(el.hidden).to.be.false;
    });
  });

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

    test('maps a legacy stored theme to its branding equivalent when branding is on', async () => {
      brandingEnabled = true;
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'default' : null));
      const el = await fixture(html`<nuxeo-theme name="hyland-light"></nuxeo-theme>`);
      expect(el._selected('hyland-light')).to.be.true;
      expect(el._selected('default')).to.be.false;
    });

    test('maps a branding stored theme to its legacy equivalent when branding is off', async () => {
      brandingEnabled = false;
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'hyland-dark' : null));
      const el = await fixture(html`<nuxeo-theme name="dark"></nuxeo-theme>`);
      expect(el._selected('dark')).to.be.true;
      expect(el._selected('hyland-dark')).to.be.false;
    });

    test('keeps a custom stored theme selected regardless of branding mode', async () => {
      brandingEnabled = true;
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'my-custom-theme' : null));
      const el = await fixture(html`<nuxeo-theme name="my-custom-theme"></nuxeo-theme>`);
      expect(el._selected('my-custom-theme')).to.be.true;
    });

    test('falls back to the default without throwing when storage access is blocked', async () => {
      sinon.stub(localStorage, 'getItem').throws(new Error('storage blocked'));
      const el = await fixture(html`<nuxeo-theme name="default"></nuxeo-theme>`);
      expect(() => el._selected('default')).to.not.throw();
      expect(el._selected('default')).to.be.true;
      expect(el._selected('dark')).to.be.false;
    });
  });

  suite('_storedTheme', () => {
    test('returns the stored theme value', async () => {
      sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'ocean' : null));
      const el = await fixture(html`<nuxeo-theme name="ocean"></nuxeo-theme>`);
      expect(el._storedTheme()).to.equal('ocean');
    });

    test('returns null without throwing when storage access is blocked', async () => {
      sinon.stub(localStorage, 'getItem').throws(new Error('storage blocked'));
      const el = await fixture(html`<nuxeo-theme name="default"></nuxeo-theme>`);
      expect(() => el._storedTheme()).to.not.throw();
      expect(el._storedTheme()).to.be.null;
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
