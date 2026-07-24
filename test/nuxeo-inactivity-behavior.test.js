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
import { INACTIVITY_ACTIVITY_KEY, NuxeoInactivityBehavior } from '../elements/behaviors/nuxeo-inactivity-behavior.js';

// Minimal host that composes the behavior exactly like nuxeo-app does — a keepAlive
// <nuxeo-resource> in the template, a _logout() URL helper, and setup/teardown wired from
// the element lifecycle (with the same _inactivityNeedsRearm guard nuxeo-app uses so attached()
// only re-arms after a real detach) — so the behavior can be tested in isolation without the full app fixture.
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
      // Mirror nuxeo-app: ready() already wired setup on the first attach, so only re-arm after a
      // real detach/re-attach cycle to avoid a redundant startup keep-alive and listener churn.
      if (this._inactivityNeedsRearm) {
        this._inactivityNeedsRearm = false;
        this._setupInactivityTimer();
        this._setupUnauthorizedRedirect();
      }
    },
    detached() {
      this._teardownInactivityTimer();
      this._teardownUnauthorizedRedirect();
      this._inactivityNeedsRearm = true; // re-arm from the next attached()
    },
  });
}

// Drain pending microtasks/macrotasks so the async logout flow (fetch -> .then(redirect)) settles before
// assertions. Uses a real 0ms timer, so callers must not rely on it while window.setTimeout is stubbed.
const settle = () => new Promise((resolve) => window.setTimeout(resolve));

suite('nuxeo-inactivity-behavior (WEBUI-1987)', () => {
  let host;
  let endSessionStub;
  let keepAliveStub;

  setup(async () => {
    // The host's ready() arms the inactivity timer and fires an immediate keep-alive via
    // <nuxeo-resource>.execute() DURING fixture creation. Stub execute on the prototype BEFORE the fixture
    // so that first keep-alive can never hit the network — stubbing the instance after fixture() resolves
    // would be too late (the initial request would already have gone out). WEBUI-1987: no real keep-alive.
    keepAliveStub = sinon.stub(customElements.get('nuxeo-resource').prototype, 'execute').resolves({});
    host = await fixture(html`<nuxeo-inactivity-test-host></nuxeo-inactivity-test-host>`);
    // The logout flow ends the session with a background GET to /logout before navigating; stub that seam
    // so tests never hit the network and the timeout-login redirect (rather than the fallback) is exercised.
    endSessionStub = sinon.stub(host, '_endServerSession').resolves({});
    await flush();
  });

  teardown(() => {
    endSessionStub.restore();
    keepAliveStub.restore();
  });

  suite('inactivity timer', () => {
    const ACTIVITY_KEY = INACTIVITY_ACTIVITY_KEY; // reuse the behavior's exported key so tests can't drift
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
      // Drop the stub-issued fake timer id (setTimeout was stubbed to return small integers 1..N)
      // before restoring the globals, so the real clearTimeout() in _teardownInactivityTimer() below is
      // only ever handed null — never a small integer that could collide with an unrelated real timeout.
      host._inactivityTimer = null;
      timeoutStub.restore();
      clearStub.restore();
      getStub.restore();
      host._teardownInactivityTimer();
      window.localStorage.removeItem(ACTIVITY_KEY);
    });

    test('arms a timeout for the configured idle period and redirects to logout when it fires', async () => {
      getStub.withArgs('session.timeout', 60).returns(1); // 1 minute
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      expect(scheduled).to.have.lengthOf(1);
      expect(scheduled[0].delay).to.equal(60000);
      window.localStorage.removeItem(ACTIVITY_KEY); // no tab has been active → real logout
      host._lastActivityTs = 0; // simulate the full idle period having elapsed (no recent local activity)
      await scheduled[0].fn(); // simulate the idle period elapsing (async: ends session then navigates)
      expect(endSessionStub).to.have.been.calledWith('https://server/nuxeo/logout'); // session ended first
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/login.jsp?nxtimeout=true');
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
      window.dispatchEvent(new StorageEvent('storage', { key: ACTIVITY_KEY, newValue: String(Date.now()) }));
      expect(scheduled).to.have.lengthOf(2); // re-armed from the remote activity
    });

    test('storage event re-arms for the REMAINING time based on the remote timestamp', () => {
      getStub.withArgs('session.timeout', 60).returns(1); // 60000ms window
      host._setupInactivityTimer();
      const remoteTs = Date.now() - 20000; // the other tab was active 20s ago
      window.dispatchEvent(new StorageEvent('storage', { key: ACTIVITY_KEY, newValue: String(remoteTs) }));
      // ~40s remaining (60000 - 20000), NOT a fresh full 60000 keyed off the event delivery time.
      expect(lastScheduled().delay).to.be.within(38000, 41000);
    });

    test('storage event older than the timeout does not re-arm (no window extension)', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer();
      const before = scheduled.length;
      // Remote activity is already older than the window; our own timer must handle logout, not extend it.
      window.dispatchEvent(new StorageEvent('storage', { key: ACTIVITY_KEY, newValue: String(Date.now() - 120000) }));
      expect(scheduled).to.have.lengthOf(before); // no new timer scheduled
    });

    test('does NOT log out when another tab was active within the timeout', async () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      host._lastActivityTs = 0; // this tab itself is idle; only the other tab is active (shared timestamp)
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now())); // another tab active just now
      await lastScheduled().fn(); // await: the callback can log out on a later microtask (Promise chain)
      expect(redirect).not.to.have.been.called; // re-armed instead of logging out
      redirect.restore();
    });

    test('records local activity even when the reset is throttled', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer();
      host._lastActivityTs = 0;
      host._lastInactivityReset = Date.now(); // within the 1s window → reset bails out before re-arming
      host._resetInactivityTimer();
      expect(host._lastActivityTs).to.be.greaterThan(0); // still recorded despite the throttle
    });

    test('does NOT log out when this tab had recent local activity (no shared timestamp)', async () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      window.localStorage.removeItem(ACTIVITY_KEY); // no cross-tab signal at all
      host._lastActivityTs = Date.now(); // but this tab was active just now (throttle may have skipped re-arm)
      await lastScheduled().fn(); // await: the callback can log out on a later microtask (Promise chain)
      expect(redirect).not.to.have.been.called; // re-armed on recent local activity instead of logging out
      redirect.restore();
    });

    test('logs out only when all tabs have been idle for the full period', async () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      host._lastActivityTs = Date.now() - 120000; // this tab idle 2 min too (both local + shared are stale)
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now() - 120000)); // last activity 2 min ago
      await lastScheduled().fn();
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/login.jsp?nxtimeout=true');
      redirect.restore();
    });

    test('logs out on resume when idle beyond the timeout (e.g. after the machine slept)', async () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      // Simulate elapsed real time while the tab was hidden (both local and shared references are stale).
      host._lastActivityTs = Date.now() - 120000;
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now() - 120000));
      await host._checkInactivityOnResume();
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/login.jsp?nxtimeout=true');
      redirect.restore();
    });

    test('does not log out on resume when activity was recent; re-arms instead', async () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      host._lastActivityTs = Date.now();
      window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      const before = scheduled.length;
      // await so a regression into the async logout path (redirect on a later microtask) is caught
      // deterministically instead of slipping past the not.called assertion.
      await host._checkInactivityOnResume();
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

    test('_resetInactivityTimer is a no-op while the feature is disabled', () => {
      // setup() tore the timer down, so _inactivityTimeoutMs is 0 (disabled).
      host._resetInactivityTimer();
      expect(scheduled).to.have.lengthOf(0);
    });

    test('_checkInactivityOnResume is a no-op while the feature is disabled', () => {
      const redirect = sinon.stub(host, '_redirect');
      host._checkInactivityOnResume(); // _inactivityTimeoutMs === 0
      expect(redirect).not.to.have.been.called;
      expect(scheduled).to.have.lengthOf(0);
      redirect.restore();
    });

    test('a queued timeout does not force a logout after teardown disabled the feature', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      host._teardownInactivityTimer(); // disables (_inactivityTimeoutMs = 0)
      host._onInactivityTimeout(); // simulate an already-queued callback firing after teardown
      expect(redirect).not.to.have.been.called;
      redirect.restore();
    });

    test('records the error and falls back to per-tab behaviour when writing shared activity fails', () => {
      const setItem = sinon.stub(window.localStorage, 'setItem').throws(new Error('quota exceeded'));
      host._recordSharedActivity(Date.now());
      expect(host._inactivityStorageError).to.be.an('error');
      setItem.restore();
    });

    test('_getLastActivity returns 0 when there is no shared or local activity', () => {
      window.localStorage.removeItem(ACTIVITY_KEY);
      host._lastActivityTs = 0;
      expect(host._getLastActivity()).to.equal(0);
    });

    test('_getLastActivity falls back to the local timestamp when reading shared activity fails', () => {
      const getItem = sinon.stub(window.localStorage, 'getItem').throws(new Error('access denied'));
      host._lastActivityTs = 0;
      expect(host._getLastActivity()).to.equal(0);
      expect(host._inactivityStorageError).to.be.an('error');
      getItem.restore();
    });

    test('_getLastActivity ignores future timestamps from a backward clock adjustment', () => {
      const future = Date.now() + 60 * 60 * 1000;
      window.localStorage.setItem(ACTIVITY_KEY, String(future));
      host._lastActivityTs = future;
      // a future value must not be trusted (would clamp idle to 0 and re-arm forever); fall back to 0
      expect(host._getLastActivity()).to.equal(0);
      window.localStorage.removeItem(ACTIVITY_KEY);
    });

    test('_getLastActivity returns the most recent non-future timestamp', () => {
      const past = Date.now() - 1000;
      window.localStorage.setItem(ACTIVITY_KEY, String(past));
      host._lastActivityTs = 0;
      expect(host._getLastActivity()).to.equal(past);
      window.localStorage.removeItem(ACTIVITY_KEY);
    });

    test('_endServerSession sends credentials so a cross-origin /logout still invalidates the session', () => {
      endSessionStub.restore();
      const fetchStub = sinon.stub(globalThis, 'fetch').resolves({});
      try {
        host._endServerSession('https://server/nuxeo/logout');
        expect(fetchStub).to.have.been.calledWithMatch('https://server/nuxeo/logout', { credentials: 'include' });
      } finally {
        fetchStub.restore();
        // re-stub so the shared teardown's endSessionStub.restore() still has a valid wrapper
        endSessionStub = sinon.stub(host, '_endServerSession').resolves({});
      }
    });

    test('logs out when the idle timer fires and reading shared activity throws', async () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      const redirect = sinon.stub(host, '_redirect');
      host._setupInactivityTimer();
      host._lastActivityTs = 0; // no recent local activity either → genuinely idle
      const getItem = sinon.stub(window.localStorage, 'getItem').throws(new Error('access denied'));
      await lastScheduled().fn(); // timer fires; getItem throws -> catch -> per-tab logout
      expect(host._inactivityStorageError).to.be.an('error');
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/login.jsp?nxtimeout=true');
      getItem.restore();
      redirect.restore();
    });

    test('keep-alive is skipped when no keepAlive resource is available', () => {
      const original = host.$.keepAlive;
      host.$.keepAlive = null; // no resource -> the execute() branch is not taken
      host._inactivityKeepAliveMs = 30000;
      host._lastKeepAlive = 0;
      expect(() => host._maybeKeepServerSessionAlive(Date.now())).to.not.throw();
      host.$.keepAlive = original;
    });

    test('ignores storage events for unrelated keys or without a new value', () => {
      getStub.withArgs('session.timeout', 60).returns(1);
      host._setupInactivityTimer();
      const before = scheduled.length;
      host._lastInactivityReset = Date.now() - 2000; // bypass throttle so a real signal would re-arm
      host._onInactivityStorage({ key: 'some-other-key', newValue: '123' });
      host._onInactivityStorage({ key: ACTIVITY_KEY, newValue: null });
      expect(scheduled).to.have.lengthOf(before); // neither re-armed the timer
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

    test('ends the session then redirects to the timeout login page on a 401 unauthorized-request', async () => {
      // The fixture's ready()/attached() already wired the listener via _setupUnauthorizedRedirect().
      document.dispatchEvent(new CustomEvent('unauthorized-request', { bubbles: true, composed: true }));
      await settle();
      expect(endSessionStub).to.have.been.calledWith('https://server/nuxeo/logout'); // session ended first
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/login.jsp?nxtimeout=true');
    });

    test('is one-shot: a burst of 401s triggers a single logout redirect', async () => {
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      await settle();
      expect(redirect).to.have.been.calledOnce;
    });

    test('teardown removes the 401 listener', async () => {
      host._teardownUnauthorizedRedirect();
      document.dispatchEvent(new CustomEvent('unauthorized-request'));
      await settle();
      expect(redirect).not.to.have.been.called;
    });

    test('derives the login page from the logout URL even when it carries a query string', async () => {
      const logout = sinon.stub(host, '_logout').returns('https://server/nuxeo/logout?foo=bar');
      await host._logoutRedirect();
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/login.jsp?nxtimeout=true');
      logout.restore();
    });

    test('falls back to a plain logout navigation when the logout request fails', async () => {
      endSessionStub.rejects(new Error('offline')); // GET /logout could not be made
      await host._logoutRedirect();
      // Session teardown still attempted, and we navigate to plain logout (message may be skipped).
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/logout');
    });

    test('records the error and still navigates when ending the session throws synchronously', async () => {
      endSessionStub.throws(new Error('blocked'));
      await host._logoutRedirect();
      expect(host._inactivityLogoutError).to.be.an('error');
      expect(redirect).to.have.been.calledOnceWith('https://server/nuxeo/logout');
    });
  });
});
