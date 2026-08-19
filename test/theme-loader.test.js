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
import { SAFE_THEME_PATTERN, safeSetTheme, getValidTheme, loadTheme } from '../themes/loader.js';
import { getDefaultTheme, resolveTheme } from '../themes/theme-config.js';
import { config } from '@nuxeo/nuxeo-elements';

suite('theme-loader', () => {
  let getItemStub;
  let setItemStub;
  let warnStub;

  setup(() => {
    // Force the branding flag off so getDefaultTheme()/resolveTheme() return deterministic
    // classic-theme values regardless of any config state left by other suites.
    sinon.stub(config, 'get').callsFake((path, fallback) => fallback);
    getItemStub = sinon.stub(localStorage, 'getItem');
    setItemStub = sinon.stub(localStorage, 'setItem');
    warnStub = sinon.stub(console, 'warn');
  });

  teardown(() => {
    sinon.restore();
  });

  suite('SAFE_THEME_PATTERN', () => {
    test('should reject unsafe characters and path traversal', () => {
      ['foo/bar', 'foo\\bar', '../etc', 'http:', '%2f', 'default?x=1', 'default#foo'].forEach((value) => {
        expect(SAFE_THEME_PATTERN.test(value), `expected "${value}" to be rejected`).to.be.false;
      });
    });

    test('should allow valid theme names', () => {
      ['default', 'dark', 'light', 'kawaii', 'my-custom-theme'].forEach((value) => {
        expect(SAFE_THEME_PATTERN.test(value), `expected "${value}" to be allowed`).to.be.true;
      });
    });
  });

  suite('safeSetTheme', () => {
    test('should not throw and should warn when localStorage is unavailable', () => {
      setItemStub.throws(new Error('SecurityError'));
      expect(() => safeSetTheme('dark')).to.not.throw();
      expect(warnStub).to.have.been.calledOnce;
    });

    test('should warn using String(e) when the thrown value has no message', () => {
      setItemStub.callsFake(() => {
        throw 'boom';
      });
      expect(() => safeSetTheme('dark')).to.not.throw();
      expect(warnStub).to.have.been.calledWith('Failed to persist theme preference:', 'boom');
    });
  });

  suite('getValidTheme', () => {
    test('should return the resolved stored theme when valid', () => {
      getItemStub.returns('dark');
      expect(getValidTheme()).to.equal(resolveTheme('dark'));
    });

    test('should return the default theme and not write when key is absent', () => {
      getItemStub.returns(null);
      expect(getValidTheme()).to.equal(getDefaultTheme());
      expect(setItemStub).to.not.have.been.called;
    });

    test('should return the default theme and correct storage for unsafe values', () => {
      getItemStub.returns('../malicious');
      expect(getValidTheme()).to.equal(getDefaultTheme());
      expect(setItemStub).to.have.been.calledWith('theme', getDefaultTheme());
    });

    test('should trim whitespace and persist the normalized value', () => {
      getItemStub.returns('  dark  ');
      expect(getValidTheme()).to.equal(resolveTheme('dark'));
      expect(setItemStub).to.have.been.calledWith('theme', resolveTheme('dark'));
    });

    test('should return the default theme when localStorage.getItem throws', () => {
      getItemStub.throws(new Error('SecurityError'));
      expect(getValidTheme()).to.equal(getDefaultTheme());
    });

    test('should warn using String(e) when getItem throws a value with no message', () => {
      getItemStub.callsFake(() => {
        throw 'nope';
      });
      expect(getValidTheme()).to.equal(getDefaultTheme());
      expect(warnStub).to.have.been.calledWith('Failed to read theme preference:', 'nope');
    });
  });

  suite('loadTheme', () => {
    let xhrStub;
    let fakeXhr;

    setup(() => {
      // Remove any link[rel="import"] elements added by previous runs
      document.querySelectorAll('link[rel="import"]').forEach((el) => el.remove());
    });

    test('should add a theme link when theme file exists', () => {
      getItemStub.returns('dark');
      const resolved = resolveTheme('dark');
      fakeXhr = { open: sinon.stub(), send: sinon.stub(), readyState: 4, status: 200 };
      fakeXhr.send.callsFake(function () {
        fakeXhr.onreadystatechange();
      });
      xhrStub = sinon.stub(window, 'XMLHttpRequest').returns(fakeXhr);

      loadTheme();

      const link = document.querySelector(`link[rel="import"][href="themes/${resolved}/theme.html"]`);
      expect(link).to.exist;
      xhrStub.restore();
    });

    test('should fallback to the default theme when the theme file returns 404', () => {
      getItemStub.returns('nonexistent');
      const fallback = getDefaultTheme();
      fakeXhr = { open: sinon.stub(), send: sinon.stub(), readyState: 4, status: 404 };
      fakeXhr.send.callsFake(function () {
        fakeXhr.onreadystatechange();
      });
      xhrStub = sinon.stub(window, 'XMLHttpRequest').returns(fakeXhr);

      loadTheme();

      expect(warnStub).to.have.been.calledWithMatch('not found');
      expect(setItemStub).to.have.been.calledWith('theme', fallback);
      const link = document.querySelector(`link[rel="import"][href="themes/${fallback}/theme.html"]`);
      expect(link).to.exist;
      xhrStub.restore();
    });

    test('should fallback to the default theme when the theme file returns a 5xx error', () => {
      getItemStub.returns('dark');
      const fallback = getDefaultTheme();
      fakeXhr = { open: sinon.stub(), send: sinon.stub(), readyState: 4, status: 500 };
      fakeXhr.send.callsFake(function () {
        fakeXhr.onreadystatechange();
      });
      xhrStub = sinon.stub(window, 'XMLHttpRequest').returns(fakeXhr);

      loadTheme();

      expect(setItemStub).to.have.been.calledWith('theme', fallback);
      const link = document.querySelector(`link[rel="import"][href="themes/${fallback}/theme.html"]`);
      expect(link).to.exist;
      xhrStub.restore();
    });

    test('should keep the requested theme and not reset preference on a network error (status 0)', () => {
      getItemStub.returns('dark');
      const resolved = resolveTheme('dark');
      fakeXhr = { open: sinon.stub(), send: sinon.stub(), readyState: 4, status: 0 };
      fakeXhr.send.callsFake(function () {
        fakeXhr.onreadystatechange();
      });
      xhrStub = sinon.stub(window, 'XMLHttpRequest').returns(fakeXhr);

      loadTheme();

      // No fallback persisted: a transient network failure must not overwrite the user's choice.
      expect(setItemStub).to.not.have.been.calledWith('theme', getDefaultTheme());
      const link = document.querySelector(`link[rel="import"][href="themes/${resolved}/theme.html"]`);
      expect(link).to.exist;
      xhrStub.restore();
    });

    test('should skip link insertion when readyState is not DONE', () => {
      getItemStub.returns('dark');
      fakeXhr = { open: sinon.stub(), send: sinon.stub(), readyState: 3, status: 200 };
      fakeXhr.send.callsFake(function () {
        fakeXhr.onreadystatechange();
      });
      xhrStub = sinon.stub(window, 'XMLHttpRequest').returns(fakeXhr);

      loadTheme();

      expect(document.querySelector('link[rel="import"]')).to.not.exist;
      xhrStub.restore();
    });
  });

  suite('when branding is enabled', () => {
    let xhrStub;

    setup(() => {
      // Flip only the branding flag; the outer stub still returns the fallback for every other path.
      // Match the full call signature used by production code (config.get('branding.rebrand', false))
      // to avoid brittle argument-matching behavior across Sinon versions.
      config.get.withArgs('branding.rebrand', false).returns(true);
      document.querySelectorAll('link[rel="import"]').forEach((el) => el.remove());
    });

    test('should return hyland-light as the default theme when key is absent', () => {
      getItemStub.returns(null);
      expect(getValidTheme()).to.equal('hyland-light');
      expect(setItemStub).to.not.have.been.called;
    });

    test('should remap a stored legacy theme to its branding equivalent and persist it', () => {
      getItemStub.returns('dark');
      expect(getValidTheme()).to.equal('hyland-dark');
      expect(setItemStub).to.have.been.calledWith('theme', 'hyland-dark');
    });

    test('should fallback to hyland-light when the theme file returns 404', () => {
      getItemStub.returns('nonexistent');
      const fakeXhr = { open: sinon.stub(), send: sinon.stub(), readyState: 4, status: 404 };
      fakeXhr.send.callsFake(function () {
        fakeXhr.onreadystatechange();
      });
      xhrStub = sinon.stub(window, 'XMLHttpRequest').returns(fakeXhr);

      loadTheme();

      expect(warnStub).to.have.been.calledWithMatch('not found');
      expect(setItemStub).to.have.been.calledWith('theme', 'hyland-light');
      const link = document.querySelector('link[rel="import"][href="themes/hyland-light/theme.html"]');
      expect(link).to.exist;
      xhrStub.restore();
    });
  });

  suite('window.Nuxeo.UI.getValidTheme global', () => {
    // Importing themes/loader.js at the top of this file already ran the module side effect that
    // defines the global, so we assert against the value installed at load time.
    test('should expose the canonical getValidTheme resolver for legacy components', () => {
      expect(window.Nuxeo.UI.getValidTheme).to.equal(getValidTheme);
    });

    test('should define the global as non-writable, non-configurable and enumerable', () => {
      const descriptor = Object.getOwnPropertyDescriptor(window.Nuxeo.UI, 'getValidTheme');
      expect(descriptor).to.exist;
      expect(descriptor.writable).to.be.false;
      expect(descriptor.configurable).to.be.false;
      expect(descriptor.enumerable).to.be.true;
    });
  });
});
