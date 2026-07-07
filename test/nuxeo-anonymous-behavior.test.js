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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-app.js';

suite('nuxeo-anonymous-behavior', () => {
  let app;

  setup(async () => {
    app = await fixture(html`<nuxeo-app></nuxeo-app>`);
    sinon.stub(app, 'i18n').callsFake((key) => key);
    if (app.$ && app.$.userWorkspace) {
      sinon.stub(app.$.userWorkspace, 'execute').resolves({ path: '/user-workspace' });
    }
    if (app.$ && app.$.tasksProvider) {
      sinon.stub(app.$.tasksProvider, 'fetch').resolves({ resultsCount: 0 });
    }
    await flush();
  });

  teardown(() => {
    // Some tests write the `nuxeo.start.url.fragment` cookie; clear it so state does not leak
    // into other unit tests running in the same browser session.
    document.cookie = 'nuxeo.start.url.fragment=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  suite('_isAnonymousUser', () => {
    test('is false when there is no current user', () => {
      app.currentUser = null;
      expect(app._isAnonymousUser()).to.be.false;
    });

    test('is false for an authenticated (non-anonymous) user', () => {
      app.currentUser = { id: 'jdoe', isAnonymous: false, properties: {} };
      expect(app._isAnonymousUser()).to.be.false;
    });

    test('is true for the anonymous user', () => {
      app.currentUser = { id: 'Anonymous', isAnonymous: true, properties: {} };
      expect(app._isAnonymousUser()).to.be.true;
    });
  });

  suite('_isAnonymousForbidden', () => {
    test('is true for an anonymous user and a 403 error', () => {
      app.currentUser = { id: 'Anonymous', isAnonymous: true, properties: {} };
      expect(app._isAnonymousForbidden({ status: 403 })).to.be.true;
    });

    test('coerces string status codes', () => {
      app.currentUser = { id: 'Anonymous', isAnonymous: true, properties: {} };
      expect(app._isAnonymousForbidden({ status: '403' })).to.be.true;
    });

    test('is false for an anonymous user and a non-403 error', () => {
      app.currentUser = { id: 'Anonymous', isAnonymous: true, properties: {} };
      expect(app._isAnonymousForbidden({ status: 404 })).to.be.false;
    });

    test('is false for an authenticated user even on a 403', () => {
      app.currentUser = { id: 'jdoe', isAnonymous: false, properties: {} };
      expect(app._isAnonymousForbidden({ status: 403 })).to.be.false;
    });

    test('is false when there is no error', () => {
      app.currentUser = { id: 'Anonymous', isAnonymous: true, properties: {} };
      expect(app._isAnonymousForbidden(undefined)).to.be.false;
    });
  });

  suite('_redirectAnonymousToLogin', () => {
    test('redirects through the logout endpoint preserving the requested URL', () => {
      const redirect = sinon.stub(app, '_redirect');
      app._redirectAnonymousToLogin();
      expect(redirect.calledOnce).to.be.true;
      const url = redirect.firstCall.args[0];
      expect(url).to.contain('/logout?requestedUrl=');
      // requestedUrl must be the context-relative path (no origin), url-encoded
      const expected = encodeURIComponent(`${globalThis.location.pathname}${globalThis.location.search}`);
      expect(url).to.contain(`requestedUrl=${expected}`);
      // forceAnonymousLogin=true is required so the server renders the login form instead of silently
      // re-authenticating the follow-up request as anonymous (which would loop back to the document)
      expect(url).to.contain('&forceAnonymousLogin=true');
      // the fragment (Web UI route) is re-appended so it survives the logout redirect chain
      expect(url.endsWith(globalThis.location.hash)).to.be.true;
    });

    test('stores the current URL fragment in a cookie for post-login restore', () => {
      sinon.stub(app, '_redirect');
      app._redirectAnonymousToLogin();
      expect(document.cookie).to.contain('nuxeo.start.url.fragment');
    });

    test('is guarded so repeated 403s only trigger a single redirect', () => {
      const redirect = sinon.stub(app, '_redirect');
      app._redirectAnonymousToLogin();
      app._redirectAnonymousToLogin();
      app._redirectAnonymousToLogin();
      expect(redirect.calledOnce).to.be.true;
    });

    test('uses the connection URL as the logout base', () => {
      const redirect = sinon.stub(app, '_redirect');
      app.$.nxcon.url = '/nuxeo';
      app._redirectAnonymousToLogin();
      expect(redirect.firstCall.args[0]).to.match(/^\/nuxeo\/logout\?/);
    });

    test('falls back to the element url when the connection has no URL', () => {
      const redirect = sinon.stub(app, '_redirect');
      app.$.nxcon.url = '';
      app.url = '/custom-base';
      app._redirectAnonymousToLogin();
      expect(redirect.firstCall.args[0]).to.match(/^\/custom-base\/logout\?/);
    });

    test('falls back to a context-relative logout when no base URL is available', () => {
      const redirect = sinon.stub(app, '_redirect');
      app.$.nxcon.url = '';
      app.url = '';
      app._redirectAnonymousToLogin();
      expect(redirect.firstCall.args[0]).to.match(/^\/logout\?/);
    });
  });

  suite('load() integration', () => {
    test('redirects to login (not the error page) when an anonymous user gets a 403', async () => {
      app.currentUser = { id: 'Anonymous', isAnonymous: true, properties: {} };
      const redirect = sinon.stub(app, '_redirect');
      const showError = sinon.stub(app, 'showError');
      sinon
        .stub(app, '_loadDocument')
        .rejects({ status: 403, message: "Privilege 'Read' is not granted to 'Anonymous'" });
      app.load('browse', 'some-uid', '', 'view');
      await flush();
      // allow the rejected promise chain to settle
      await Promise.resolve();
      expect(redirect.calledOnce).to.be.true;
      expect(showError.called).to.be.false;
    });

    test('shows the error page when an authenticated user gets a 403', async () => {
      app.currentUser = { id: 'jdoe', isAnonymous: false, properties: {} };
      const redirect = sinon.stub(app, '_redirect');
      const showError = sinon.stub(app, 'showError');
      sinon.stub(app, '_loadDocument').rejects({ status: 403, message: 'forbidden' });
      app.load('browse', 'some-uid', '', 'view');
      await flush();
      await Promise.resolve();
      expect(redirect.called).to.be.false;
      expect(showError.calledOnce).to.be.true;
    });
  });
});
