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
import '../elements/nuxeo-app/nuxeo-menu-item.js';

suite('nuxeo-menu-item', () => {
  let server;
  let el;

  setup(async () => {
    server = await login();
    el = await fixture(html`<nuxeo-menu-item label="app.test"></nuxeo-menu-item>`);
    sinon.stub(el, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  const anchorHref = () => el.shadowRoot.querySelector('a').getAttribute('href');

  /** urlFor is a Polymer computed from router; shadow it with a stub for unit tests. */
  const withStubUrlFor = (stub) => {
    Object.defineProperty(el, 'urlFor', { value: stub, configurable: true, writable: true });
  };

  suite('_href', () => {
    test('uses explicit link when set', async () => {
      withStubUrlFor(sinon.stub().returns('/ignored'));
      el.link = 'https://example.com/logout';
      el.route = 'admin:analytics';
      await flush();
      expect(anchorHref()).to.equal('https://example.com/logout');
    });

    test('uses urlFor with route name only', async () => {
      const urlFor = sinon.stub().returns('/home');
      withStubUrlFor(urlFor);
      el.link = '';
      el.route = 'home';
      await flush();
      expect(anchorHref()).to.equal('/home');
      expect(urlFor.calledOnceWithExactly('home')).to.be.true;
    });

    test('uses urlFor with name and route segments', async () => {
      const urlFor = sinon.stub().returns('/doc');
      withStubUrlFor(urlFor);
      el.route = 'document:uid123';
      await flush();
      expect(anchorHref()).to.equal('/doc');
      expect(urlFor.calledOnceWithExactly('document', 'uid123')).to.be.true;
    });

    test('passes empty first arg segment for leading slash in route args', async () => {
      const urlFor = sinon.stub().returns('/browse');
      withStubUrlFor(urlFor);
      el.route = 'browse:/default';
      await flush();
      expect(anchorHref()).to.equal('/browse');
      expect(urlFor.calledOnceWithExactly('browse', '', 'default')).to.be.true;
    });
  });
});
