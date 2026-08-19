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
import '../elements/nuxeo-app/nuxeo-menu-icon.js';

suite('nuxeo-menu-icon', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-menu-icon></nuxeo-menu-icon>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default src to empty string', () => {
      expect(element.src).to.equal('');
    });

    test('should default route to empty string', () => {
      expect(element.route).to.equal('');
    });

    test('should default link to empty string', () => {
      expect(element.link).to.equal('');
    });

    test('should default _isRTL to false', () => {
      expect(element._isRTL).to.be.false;
    });
  });

  suite('_checkRtl', () => {
    test('should detect RTL from document dir', () => {
      element._checkRtl();
      // In test env, document dir is ltr
      expect(element._isRTL).to.be.false;
    });
  });

  suite('_handleTooltipPosition', () => {
    test('should set right for LTR', () => {
      element._handleTooltipPosition(false);
      expect(element._tooltipPosition).to.equal('right');
    });

    test('should set left for RTL', () => {
      element._handleTooltipPosition(true);
      expect(element._tooltipPosition).to.equal('left');
    });
  });

  suite('_srcOrIcon', () => {
    test('should prefer src over icon when src is set', async () => {
      element.icon = 'icons:home';
      element.src = 'https://cdn.example/icon.png';
      element._srcOrIcon();
      await flush();
      expect(element.$.button.src).to.equal('https://cdn.example/icon.png');
      expect(element.$.button.icon).to.equal('');
    });

    test('should set icon when src is empty', async () => {
      element.src = '';
      element.icon = 'icons:folder';
      element.$.button.src = '';
      element._srcOrIcon();
      await flush();
      expect(element.$.button.icon).to.equal('icons:folder');
    });
  });

  suite('_href', () => {
    setup(() => {
      Object.defineProperty(element, 'urlFor', {
        value: sinon.stub().returns('/stubbed-url'),
        configurable: true,
        writable: true,
      });
    });

    test('returns undefined when route is empty', () => {
      element.route = '';
      element.link = '';
      expect(element._href()).to.equal(undefined);
    });

    test('returns link when route and link are set', () => {
      element.route = 'browse';
      element.link = 'https://logout';
      expect(element._href()).to.equal('https://logout');
    });

    test('delegates to urlFor when route has segments', () => {
      element.link = '';
      element.route = 'document:uid1';
      expect(element._href()).to.equal('/stubbed-url');
      expect(element.urlFor.calledWith('document', 'uid1')).to.be.true;
    });
  });

  suite('_ariaLabel', () => {
    setup(() => {
      Object.defineProperty(element, 'urlFor', {
        value: sinon.stub().returns('/stubbed-url'),
        configurable: true,
        writable: true,
      });
    });

    test('returns the localized label when the anchor resolves to an href', () => {
      element.route = 'home';
      element.label = 'app.home';
      expect(element._ariaLabel()).to.equal('app.home');
    });

    test('returns undefined when there is no href (aria-label prohibited on generic anchor)', () => {
      element.route = '';
      element.link = '';
      element.label = 'app.administration';
      expect(element._ariaLabel()).to.equal(undefined);
    });

    test('omits aria-label attribute on the rendered anchor when route is empty', async () => {
      element.route = '';
      element.label = 'app.administration';
      await flush();
      const anchor = element.shadowRoot.querySelector('a');
      expect(anchor.hasAttribute('aria-label')).to.be.false;
    });

    test('sets aria-label attribute on the rendered anchor when route is set', async () => {
      element.route = 'home';
      element.label = 'app.home';
      await flush();
      const anchor = element.shadowRoot.querySelector('a');
      expect(anchor.getAttribute('aria-label')).to.equal('app.home');
    });
  });
});
