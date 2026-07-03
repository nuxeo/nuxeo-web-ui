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
import { config } from '@nuxeo/nuxeo-elements';
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html as polymerHtml } from '@polymer/polymer/lib/utils/html-tag.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { NuxeoInactivityBehavior } from '../elements/behaviors/nuxeo-inactivity-behavior.js';

// Minimal host that composes the behavior exactly like nuxeo-app does — a keepAlive
// <nuxeo-resource> in the template, a _logout() URL helper, and setup/teardown wired from
// the element lifecycle — so the behavior can be tested in isolation without the full app fixture.
if (!customElements.get('nuxeo-inactivity-test-host')) {
  Polymer({
    is: 'nuxeo-inactivity-test-host',
    _template: polymerHtml`<nuxeo-resource id="keepAlive" path="me"></nuxeo-resource>`,
    behaviors: [NuxeoInactivityBehavior],
    _logout() {
      return 'https://server/nuxeo/logout';
    },
    ready() {
      this._setupInactivityTimer();
      this._setupUnauthorizedRedirect();
    },
    attached() {
      this._setupInactivityTimer();
      this._setupUnauthorizedRedirect();
    },
    detached() {
      this._teardownInactivityTimer();
      this._teardownUnauthorizedRedirect();
    },
  });
}

suite('nuxeo-inactivity-behavior (WEBUI-1987)', () => {
  let host;

  setup(async () => {
    host = await fixture(html`<nuxeo-inactivity-test-host></nuxeo-inactivity-test-host>`);
    sinon.stub(host.$.keepAlive, 'execute').resolves({}); // WEBUI-1987: no real session keep-alive in tests
    await flush();
  });

  suite('inactivity timer', () => {
    const ACTIVITY_KEY = 'nuxeo-ui-inactivity-last-activity';
    let getStub;
    let timeoutStub;
    let clearStub;
    let scheduled;

    const lastScheduled = () => scheduled[scheduled.length - 1];

    setup(() => {
      // drop the timer/listeners armed by the fixture's real ready() so this suite starts clean
      host._teardownInactivityTimer();
      host._loggingOut = false;
      window.localStorage.removeItem(ACTIVITY_KEY); // start with no shared cross-tab activity
      getStub = sinon.stub(config, 'get');
      scheduled = [];
      // Stub the timer primitives instead of faking global time (faking time can freeze the shared
      // test page for every other suite). Capture scheduled callbacks and invoke them manually.
      timeoutStub = sinon.stub(window, 'setTimeout').callsFake((fn, delay) => {
        scheduled.push({ fn, delay });
        return scheduled.length;
      });
      clearStub = sinon.stub(window, 'clearTimeout');
    });

    teardown(() => {
      timeoutStub.restore();
      clearStub.restore();
      getStub.restore();
      host._teardownInactivityTimer();
      window.localStorage.removeItem(ACTIVITY_KEY);
    });

    test('arms a timeout for the configured idle period and redirects to logout when it fires', () => {
      getStub.withArgs('session.timeout', 60).returns(1); // 1 minute
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      expect(scheduled).to.have.lengthOf(1);
      expect(scheduled[0].delay).to.equal(60000);
      window.localStorage.removeItem(ACTIVITY_KEY); // no tab has been active → real logout
      scheduled[0].fn(); // simulate the idle period elapsing
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/logout');
      redirect.restore();
    });

    test('user activity re-arms the timer', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer();
      expect(scheduled).to.have.lengthOf(1);
      host._lastInactivityReset = Date.now() - 2000; // bypass the 1s throttle
      window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(clearStub).to.have.been.called;
      expect(scheduled).to.have.lengthOf(2);
    });

    test('local activity records a shared timestamp for other tabs', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer(); // initial arm propagates activity
      expect(Number(window.localStorage.getItem(ACTIVITY_KEY))).to.be.greaterThan(0);
    });

    test('activity in another tab (storage event) re-arms this tab', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer();
      expect(scheduled).to.have.lengthOf(1);
      // Simulate another tab writing activity; the throttle must not swallow a remote signal.
      host._lastInactivityReset = Date.now() - 2000;
      window.dispatchEvent(new StorageEvent('storage', { key: ACTIVITY_KEY, newValue: String(Date.now()) }));
      expect(scheduled).to.have.lengthOf(2); // re-armed from the remote activity
    });

    test('does NOT log out when another tab was active within the timeout', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now())); // another tab active just now
      lastScheduled().fn(); // this idle tab's timer fires
      expect(redirect).not.to.have.been.called; // re-armed instead of logging out
      redirect.restore();
    });

    test('logs out only when all tabs have been idle for the full period', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now() - 120000)); // last activity 2 min ago
      lastScheduled().fn();
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/logout');
      redirect.restore();
    });

    test('logs out on resume when idle beyond the timeout (e.g. after the machine slept)', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      // Simulate elapsed real time while the tab was hidden (both local and shared references are stale).
      host._lastActivityTs = Date.now() - 120000;
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now() - 120000));
      host._checkInactivityOnResume();
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/logout');
      redirect.restore();
    });

    test('does not log out on resume when activity was recent; re-arms instead', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      host._lastActivityTs = Date.now();
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      const before = scheduled.length;
      host._checkInactivityOnResume();
      expect(redirect).not.to.have.been.called;
      expect(scheduled.length).to.be.greaterThan(before); // re-armed for the remaining time
      redirect.restore();
    });

    test('renews the server session on activity, throttled to the keep-alive window', () => {
      getStub.withArgs('session.timeout', 60).returns(1); // 1 min -> keep-alive window 30s
      const execute = host.$.keepAlive.execute; // stubbed in the outer setup
      execute.resetHistory();
      host._setupInactivityTimer();
      expect(execute).to.have.been.called; // initial arm renews the session
      const afterSetup = execute.callCount;

      // Activity within the keep-alive window must NOT ping again.
      host._lastInactivityReset = Date.now() - 2000; // bypass the 1s activity throttle
      window.dispatchEvent(new MouseEvent('mousedown'));
      expect(execute.callCount).to.equal(afterSetup);

      // Once the keep-alive window has elapsed, activity pings again.
      host._lastKeepAlive = Date.now() - 40000; // older than the 30s window
      host._lastInactivityReset = Date.now() - 2000;
      window.dispatchEvent(new MouseEvent('mousedown'));
      expect(execute.callCount).to.equal(afterSetup + 1);
    });

    test('re-running setup is idempotent (tears down before re-arming)', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer();
      clearStub.resetHistory();
      host._setupInactivityTimer();
      expect(clearStub).to.have.been.called; // teardown ran before the second arm
    });

    test('a non-positive timeout disables the feature', () => {
      getStub.withArgs('session.timeout', 60).returns(0);
      host._setupInactivityTimer();
      expect(host._inactivityTimeoutMs).to.equal(0);
      expect(scheduled).to.have.lengthOf(0);
    });

    test('converts the configured minutes into milliseconds', () => {
      getStub.withArgs('session.timeout', 60).returns(60);
      host._setupInactivityTimer();
      expect(host._inactivityTimeoutMs).to.equal(60 * 60000);
      expect(scheduled[0].delay).to.equal(60 * 60000);
    });
  });

  suite('reactive logout on unauthorized request', () => {
    let redirect;

    setup(() => {
      redirect = sinon.stub(host, '_redirect');
      host._loggingOut = false;
    });

    teardown(() => {
      redirect.restore();
    });

    test('redirects to logout when a 401 unauthorized-request is dispatched', () => {
      // The fixture's ready()/attached() already wired the listener via _setupUnauthorizedRedirect().
      document.dispatchEvent(new CustomEvent('unauthorized-request', { bubbles: true, composed: true }));
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/logout');
    });

    test('is one-shot: a burst of 401s triggers a single logout redirect', () => {
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      expect(redirect).to.have.been.calledOnce;
    });

    test('teardown removes the 401 listener', () => {
      host._teardownUnauthorizedRedirect();
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      expect(redirect).not.to.have.been.called;
    });
  });
});
