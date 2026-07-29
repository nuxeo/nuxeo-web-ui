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

  suite('expanded property', () => {
    test('defaults to false and is reflected as attribute', async () => {
      expect(element.expanded).to.be.false;
      expect(element.hasAttribute('expanded')).to.be.false;

      element.expanded = true;
      await flush();
      expect(element.hasAttribute('expanded')).to.be.true;

      element.expanded = false;
      await flush();
      expect(element.hasAttribute('expanded')).to.be.false;
    });

    test('hides tooltip when toggled to true', () => {
      sinon.stub(element.$.tooltip, 'hide');
      element.expanded = true;
      expect(element.$.tooltip.hide).to.have.been.calledOnce;
      element.$.tooltip.hide.restore();
    });

    test('does not call tooltip.hide when toggled to false', () => {
      element.expanded = true;
      sinon.stub(element.$.tooltip, 'hide');
      element.expanded = false;
      expect(element.$.tooltip.hide).to.not.have.been.called;
      element.$.tooltip.hide.restore();
    });

    test('binds tooltip hidden attribute to expanded', async () => {
      const tooltip = element.$.tooltip;
      element.expanded = true;
      await flush();
      expect(tooltip.hasAttribute('hidden')).to.be.true;

      element.expanded = false;
      await flush();
      expect(tooltip.hasAttribute('hidden')).to.be.false;
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

    test('returns link even when route is empty (e.g. the home icon)', () => {
      element.route = '';
      element.link = '/nuxeo/ui/#!/home';
      expect(element._href()).to.equal('/nuxeo/ui/#!/home');
    });

    test('delegates to urlFor when route has segments', () => {
      element.link = '';
      element.route = 'document:uid1';
      expect(element._href()).to.equal('/stubbed-url');
      expect(element.urlFor.calledWith('document', 'uid1')).to.be.true;
    });

    test('returns undefined when route is set but urlFor is not available', () => {
      element.urlFor = undefined;
      element.link = '';
      element.route = 'document:uid1';
      expect(element._href()).to.be.undefined;
    });
  });

  test('_srcOrIcon keeps existing button src when src is empty', () => {
    element.src = '';
    element.icon = 'icons:folder';
    element.$.button.src = 'https://cdn.example/existing.png';
    element.$.button.icon = 'icons:existing';

    element._srcOrIcon();

    expect(element.$.button.src).to.equal('https://cdn.example/existing.png');
    expect(element.$.button.icon).to.equal('icons:existing');
  });
});
