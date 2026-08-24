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
import { config } from '@nuxeo/nuxeo-elements';
import { isBrandingEnabled, getDefaultTheme, shouldHideTheme, resolveTheme } from '../themes/theme-config.js';

suite('theme-config', () => {
  let getStub;
  let brandingEnabled;

  setup(() => {
    brandingEnabled = false;
    getStub = sinon.stub(config, 'get').callsFake((path, fallback) => {
      if (path === 'branding.rebrand') {
        return brandingEnabled;
      }
      return fallback;
    });
  });

  teardown(() => {
    sinon.restore();
  });

  suite('isBrandingEnabled', () => {
    test('reads branding.rebrand from config', () => {
      brandingEnabled = true;
      expect(isBrandingEnabled()).to.be.true;
      expect(getStub).to.have.been.calledWith('branding.rebrand', false);
    });

    test('defaults to false when config returns false', () => {
      brandingEnabled = false;
      expect(isBrandingEnabled()).to.be.false;
    });

    test('returns false without throwing when the config layer throws', () => {
      getStub.throws(new Error('Nuxeo.UI.config not ready'));
      const warnStub = sinon.stub(console, 'warn');
      expect(() => isBrandingEnabled()).to.not.throw();
      expect(isBrandingEnabled()).to.be.false;
      expect(warnStub).to.have.been.called;
    });
  });

  suite('defensive fallback when config throws', () => {
    setup(() => {
      getStub.throws(new Error('Nuxeo.UI.config not ready'));
      sinon.stub(console, 'warn');
    });

    test('getDefaultTheme falls back to legacy default', () => {
      expect(getDefaultTheme()).to.equal('default');
    });

    test('resolveTheme falls back to legacy mode', () => {
      expect(resolveTheme('')).to.equal('default');
      expect(resolveTheme('hyland-light')).to.equal('default');
      expect(resolveTheme('hyland-dark')).to.equal('dark');
      expect(resolveTheme('my-custom-theme')).to.equal('my-custom-theme');
    });

    test('shouldHideTheme hides branding built-ins (legacy mode)', () => {
      expect(shouldHideTheme('hyland-light')).to.be.true;
      expect(shouldHideTheme('hyland-dark')).to.be.true;
      expect(shouldHideTheme('default')).to.be.false;
    });
  });

  suite('getDefaultTheme', () => {
    test('returns legacy default when branding is off', () => {
      brandingEnabled = false;
      expect(getDefaultTheme()).to.equal('default');
    });

    test('returns Hyland default when branding is on', () => {
      brandingEnabled = true;
      expect(getDefaultTheme()).to.equal('hyland-light');
    });
  });

  suite('shouldHideTheme', () => {
    test('hides branding built-ins when branding is off', () => {
      brandingEnabled = false;
      expect(shouldHideTheme('hyland-light')).to.be.true;
      expect(shouldHideTheme('hyland-dark')).to.be.true;
      expect(shouldHideTheme('my-custom-theme')).to.be.false;
    });

    test('hides legacy built-ins when branding is on', () => {
      brandingEnabled = true;
      expect(shouldHideTheme('default')).to.be.true;
      expect(shouldHideTheme('dark')).to.be.true;
      expect(shouldHideTheme('my-custom-theme')).to.be.false;
    });
  });

  suite('resolveTheme', () => {
    test('uses mode default when value is missing', () => {
      brandingEnabled = false;
      expect(resolveTheme('')).to.equal('default');
      brandingEnabled = true;
      expect(resolveTheme('')).to.equal('hyland-light');
    });

    test('maps branding to legacy when branding is off', () => {
      brandingEnabled = false;
      expect(resolveTheme('hyland-light')).to.equal('default');
      expect(resolveTheme('hyland-dark')).to.equal('dark');
      expect(resolveTheme('my-custom-theme')).to.equal('my-custom-theme');
    });

    test('maps legacy to branding when branding is on', () => {
      brandingEnabled = true;
      expect(resolveTheme('default')).to.equal('hyland-light');
      expect(resolveTheme('dark')).to.equal('hyland-dark');
      expect(resolveTheme('my-custom-theme')).to.equal('my-custom-theme');
    });
  });
});
