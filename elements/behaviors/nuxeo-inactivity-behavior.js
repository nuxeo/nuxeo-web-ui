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

/**
 * WEBUI-1987: localStorage key used to share the last user-activity timestamp across tabs of the same
 * origin, so activity in ANY tab keeps the whole session alive (only all-tabs-idle triggers logout).
 */
export const INACTIVITY_ACTIVITY_KEY = 'nuxeo-ui-inactivity-last-activity';

/**
 * WEBUI-2189: sessionStorage key holding the page the user was on when an inactivity/401 logout fired, so
 * we can return them there after they re-authenticate. sessionStorage (not localStorage) scopes it to the
 * originating tab and clears it when that tab closes — bounding its lifetime and avoiding a cross-tab
 * hijack. It is consumed once, on the next app boot, and validated to be same-origin before navigating.
 */
export const INACTIVITY_REQUESTED_URL_KEY = 'nuxeo-ui-inactivity-requested-url';

/**
 * Client-side session inactivity handling (WEBUI-1987, CWE-613 Insufficient Session Expiration).
 *
 * Arms an idle timer (from the `session.timeout` config, in minutes) that logs the user out after a
 * period with no interaction, so sensitive data is not left on screen once the server session expires.
 * Activity is shared across same-origin tabs (via `INACTIVITY_ACTIVITY_KEY`) and renews the server HTTP
 * session (throttled keep-alive), so an active user in any tab stays logged in and logout only happens
 * when every tab has been idle for the full period. A 401 (`unauthorized-request`) redirects to logout.
 *
 * Expects the host to provide `_logout()` (the logout URL) and, for the keep-alive, a `keepAlive`
 * `<nuxeo-resource>` in its template (`this.$.keepAlive`). Host wires setup/teardown from its
 * `ready()`/`attached()`/`detached()` lifecycle; all setup methods are idempotent.
 *
 * @polymerBehavior Nuxeo.InactivityBehavior
 */
export const NuxeoInactivityBehavior = {
  // WEBUI-1987 (CWE-613): arm a client-side inactivity timer that logs the user out after a
  // configurable idle period, so sensitive data is not left on-screen once the server session expires.
  // Activity is shared across tabs (see INACTIVITY_ACTIVITY_KEY) so working in one tab keeps every tab's
  // session alive — logout only happens when the user is idle in ALL tabs for the full period.
  _setupInactivityTimer() {
    this._teardownInactivityTimer(); // idempotent: never stack listeners/timers across calls
    const minutes = Number(config.get('session.timeout', 60));
    this._inactivityTimeoutMs = minutes > 0 ? minutes * 60000 : 0;
    if (!this._inactivityTimeoutMs) {
      return; // a non-positive or invalid timeout disables the feature
    }
    // Renew the server session on activity, well before it lapses. Server session == session.timeout,
    // so ping at half the window (with a sane floor) to keep an active user logged in across tabs.
    this._inactivityKeepAliveMs = Math.max(Math.floor(this._inactivityTimeoutMs / 2), 5000);
    this._lastKeepAlive = 0;
    this._inactivityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    this._inactivityListenerOptions = { passive: true, capture: true };
    this._boundResetInactivityTimer = () => this._resetInactivityTimer();
    this._inactivityEvents.forEach((evt) =>
      globalThis.addEventListener(evt, this._boundResetInactivityTimer, this._inactivityListenerOptions),
    );
    // Cross-tab activity: reset this tab's timer when another tab records activity.
    this._boundInactivityStorage = (e) => this._onInactivityStorage(e);
    globalThis.addEventListener('storage', this._boundInactivityStorage);
    // Background tabs/sleeping machines throttle or suspend setTimeout, so re-check idle time whenever
    // the tab becomes visible/focused again and log out immediately if the timeout already elapsed.
    this._boundInactivityResume = () => this._checkInactivityOnResume();
    document.addEventListener('visibilitychange', this._boundInactivityResume);
    globalThis.addEventListener('focus', this._boundInactivityResume);
    this._lastInactivityReset = 0; // ensure the initial arm is never throttled
    this._resetInactivityTimer();
  },

  _resetInactivityTimer(propagate = true) {
    if (!this._inactivityTimeoutMs) {
      return;
    }
    const now = Date.now();
    // Record local activity BEFORE the throttle can bail out: even on a throttled tick that doesn't re-arm
    // the timer, the (already scheduled) timeout callback must still see this recent activity via
    // _getLastActivity() and not log out a user who was active within the throttle window.
    this._lastActivityTs = now;
    // Throttle re-arming so continuous events (e.g. mousemove) don't clear/set the timer on every tick.
    if (this._lastInactivityReset && now - this._lastInactivityReset < 1000) {
      return;
    }
    this._lastInactivityReset = now;
    clearTimeout(this._inactivityTimer);
    this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), this._inactivityTimeoutMs);
    // Broadcast this activity to other tabs (skip when the reset was itself triggered by another tab).
    // The tab where the activity actually happened is also the one that renews the shared server session.
    if (propagate) {
      this._recordSharedActivity(now);
      this._maybeKeepServerSessionAlive(now);
    }
  },

  // Renew the server HTTP session (throttled) so genuine user activity keeps the session alive even
  // when it produces no other server requests (e.g. reading, mouse movement).
  _maybeKeepServerSessionAlive(now) {
    if (
      !this._inactivityKeepAliveMs ||
      (this._lastKeepAlive && now - this._lastKeepAlive < this._inactivityKeepAliveMs)
    ) {
      return;
    }
    this._lastKeepAlive = now;
    const keepAlive = this.$?.keepAlive;
    if (keepAlive && typeof keepAlive.execute === 'function') {
      keepAlive.execute().catch(() => {
        // A failure here (e.g. the session already expired) is handled by the 401 -> logout redirect.
      });
    }
  },

  // Persist the activity timestamp so other tabs (listening via the 'storage' event) can keep alive.
  _recordSharedActivity(now) {
    try {
      globalThis.localStorage.setItem(INACTIVITY_ACTIVITY_KEY, String(now));
    } catch (e) {
      // localStorage may be unavailable (private mode/quota); fall back to per-tab behaviour.
      this._inactivityStorageError = e;
    }
  },

  // Most recent activity across all tabs (shared timestamp), falling back to this tab's own when
  // localStorage is unavailable. Used to decide whether an elapsed timer should log out or re-arm.
  _getLastActivity() {
    const now = Date.now();
    let shared = 0;
    try {
      shared = Number(globalThis.localStorage.getItem(INACTIVITY_ACTIVITY_KEY)) || 0;
    } catch (e) {
      // localStorage unavailable; rely on this tab's local reference below.
      this._inactivityStorageError = e;
    }
    // Ignore timestamps in the future (e.g. recorded before a backward system-clock adjustment): a
    // future value would clamp idle time to 0 and let the timer re-arm indefinitely, extending the
    // inactivity window past the configured timeout — weakening this security timer (CWE-613). Falling
    // back to 0 makes the tab look fully idle, keeping the timer bounded.
    const candidates = [shared, this._lastActivityTs || 0].filter((ts) => ts <= now);
    return candidates.length ? Math.max(...candidates) : 0;
  },

  // Another tab recorded activity — re-arm this (possibly idle) tab without re-broadcasting.
  _onInactivityStorage(e) {
    if (e?.key !== INACTIVITY_ACTIVITY_KEY || !e.newValue || !this._inactivityTimeoutMs) {
      return;
    }
    // Re-arm from the REMOTE activity timestamp (when the other tab was actually active), not this event's
    // delivery time. Using delivery time (as a plain _resetInactivityTimer would) could extend the
    // effective inactivity window beyond the real activity — weakening this security timer (CWE-613).
    // Schedule only the remaining time, clamped to >= 0 for backward clock skew.
    const remoteTs = Number(e.newValue) || 0;
    // Ignore a future remote timestamp (backward clock adjustment): trusting it would clamp idleFor to 0
    // and re-arm for a full timeout — and poison _lastActivityTs — extending the idle window across tabs.
    // This mirrors _getLastActivity()'s rule; let this tab's own timer handle logout instead (CWE-613).
    if (remoteTs > Date.now()) {
      return;
    }
    this._lastActivityTs = Math.max(this._lastActivityTs || 0, remoteTs); // keep local ref in sync (monotonic)
    const idleFor = Math.max(0, Date.now() - remoteTs);
    if (idleFor >= this._inactivityTimeoutMs) {
      return; // remote activity is already older than the window; our own timer will handle logout
    }
    clearTimeout(this._inactivityTimer);
    this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), this._inactivityTimeoutMs - idleFor);
  },

  // On tab resume (visible/focused) reconcile against real elapsed time, since timers may have been
  // suspended while hidden/asleep. Log out if already idle past the timeout, otherwise re-arm for the rest.
  _checkInactivityOnResume() {
    if (!this._inactivityTimeoutMs || document.visibilityState === 'hidden') {
      return;
    }
    // Clamp to >= 0: a backwards clock jump (NTP sync, manual change, sleep/resume) could otherwise make
    // idleFor negative and re-arm for longer than the configured window, weakening the timer.
    const idleFor = Math.max(0, Date.now() - this._getLastActivity());
    if (idleFor >= this._inactivityTimeoutMs) {
      return this._logoutRedirect();
    }
    clearTimeout(this._inactivityTimer);
    this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), this._inactivityTimeoutMs - idleFor);
  },

  _onInactivityTimeout() {
    // Bail out if the feature was torn down (e.g. the host detached) after this callback was already
    // queued — teardown sets _inactivityTimeoutMs to 0, so a stale timer must not force a logout.
    if (!this._inactivityTimeoutMs) {
      return;
    }
    // Only log out if every tab has been idle for the full period. Use _getLastActivity() so the decision
    // reflects the most recent activity across this tab (local timestamp) AND other tabs (shared
    // localStorage): recent local activity that the 1s throttle skipped re-arming must not still log out an
    // otherwise-active user.
    const lastActivity = this._getLastActivity();
    // Clamp to >= 0 for the same clock-skew reason as _checkInactivityOnResume(): a future lastActivity
    // must not extend the effective inactivity window beyond the configured timeout.
    const idleFor = Math.max(0, Date.now() - lastActivity);
    if (lastActivity && idleFor < this._inactivityTimeoutMs) {
      // Someone was active recently (in another tab); re-arm for the remaining time instead of logging out.
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), this._inactivityTimeoutMs - idleFor);
      return undefined;
    }
    return this._logoutRedirect();
  },

  // WEBUI-1987 (CWE-613): a 401 means the (server) session is already gone. Rather than leaving the
  // now-inaccessible page on screen behind the "session expired" banner, redirect to logout. This also
  // propagates an inactivity logout in one tab to any other open tabs, whose next request returns 401.
  _setupUnauthorizedRedirect() {
    this._teardownUnauthorizedRedirect(); // idempotent: never stack listeners across calls
    this._boundUnauthorizedRedirect = () => this._logoutRedirect();
    // The event bubbles (composed) from nuxeo-resource/nuxeo-operation up to document.
    document.addEventListener('unauthorized-request', this._boundUnauthorizedRedirect);
  },

  _teardownUnauthorizedRedirect() {
    if (this._boundUnauthorizedRedirect) {
      document.removeEventListener('unauthorized-request', this._boundUnauthorizedRedirect);
      this._boundUnauthorizedRedirect = null;
    }
  },

  // Single logout entry point shared by the inactivity timer and the 401 handler. The one-shot guard
  // prevents a burst of 401s (or a timer firing during logout) from triggering multiple redirects.
  // Returns a promise so callers (and tests) can await the session teardown + navigation.
  _logoutRedirect() {
    if (this._loggingOut) {
      return Promise.resolve();
    }
    this._loggingOut = true;
    // WEBUI-2189: remember where the user was so we can bring them back after re-authentication. Only this
    // inactivity/401 path saves it; the manual "Sign Out" link uses _logout() directly and must not.
    this._saveRequestedUrl();
    // We want Nuxeo's native "Your session is inactive. Please log in." message, which login.jsp only
    // renders when it receives a top-level `nxtimeout` param. We can't reach that by navigating to /logout
    // with a requestedUrl: when anonymous auth is enabled the /ui SPA bounce re-nests our value inside its
    // own requestedUrl and login.jsp never sees nxtimeout. So end the server session first with a background
    // GET to /logout, then navigate straight to the login page with nxtimeout — bypassing the SPA entirely.
    // If the logout request can't be made, fall back to a plain /logout navigation so the session is still
    // terminated (the timeout message may be skipped). Only this inactivity/401 path shows the message; the
    // manual "Sign Out" link uses _logout() directly.
    const logoutUrl = this._logout();
    const timeoutLoginUrl = `${logoutUrl.replace(/\/logout\b.*$/, '/login.jsp')}?nxtimeout=true`;
    const proceed = () => this._redirect(timeoutLoginUrl);
    const fallback = (e) => {
      this._inactivityLogoutError = e;
      this._redirect(logoutUrl);
    };
    // Chain off a resolved promise so both a synchronous throw from _endServerSession() and an async
    // rejection are funnelled through fallback — no try/catch (which Sonar flags for promise-returning
    // calls) and the session is still terminated even when the timeout-login navigation can't be shown.
    return Promise.resolve()
      .then(() => this._endServerSession(logoutUrl))
      .then(proceed, fallback);
  },

  // Background request that ends the server HTTP session (so the JSESSIONID is invalidated) without
  // following the redirect into the SPA. Isolated as a seam so tests can stub it without touching global
  // fetch. redirect:'manual' is enough: the server invalidates the session while handling GET /logout.
  // credentials:'include' (not 'same-origin') so the session cookie is still sent when the Nuxeo server
  // is on a different origin than Web UI; otherwise the /logout request would not invalidate the session
  // (CWE-613). If CORS blocks the credentialed request the promise rejects and the caller's fallback
  // navigation to /logout still terminates the session.
  _endServerSession(logoutUrl) {
    return globalThis.fetch(logoutUrl, { credentials: 'include', redirect: 'manual' });
  },

  // Use replace() (not href) so the potentially sensitive page is not left as a navigable
  // history/bfcache entry after an inactivity-driven logout.
  _redirect(url) {
    globalThis.location.replace(url);
  },

  // WEBUI-2189: persist the current page (full hashbang URL) before an inactivity/401 logout navigation,
  // so _restoreRequestedUrlAfterLogin() can return the user here once they log back in.
  _saveRequestedUrl() {
    try {
      globalThis.sessionStorage.setItem(INACTIVITY_REQUESTED_URL_KEY, globalThis.location.href);
    } catch (e) {
      // sessionStorage may be unavailable (private mode/quota); skip — we just won't restore the page.
      this._inactivityStorageError = e;
    }
  },

  // WEBUI-2189: after re-authentication the app reloads at its root, losing the page the user was on when
  // the session expired. If we saved one on this tab, send them back to it. Wired from the host's ready()
  // so it runs once per boot, before the timer/401 handlers are armed. The saved value is consumed once
  // and must be same-origin (open-redirect protection) and different from the current page before we
  // navigate.
  _restoreRequestedUrlAfterLogin() {
    let requestedUrl;
    try {
      requestedUrl = globalThis.sessionStorage.getItem(INACTIVITY_REQUESTED_URL_KEY);
      if (requestedUrl) {
        globalThis.sessionStorage.removeItem(INACTIVITY_REQUESTED_URL_KEY); // consume once, never loop
      }
    } catch (e) {
      // sessionStorage unavailable; nothing to restore.
      this._inactivityStorageError = e;
      return;
    }
    // Same-origin guard: compare against `origin + '/'`, not a bare `origin`, so a look-alike host such as
    // https://evil-<origin-host> can't slip past the prefix check and cause an open redirect.
    if (
      requestedUrl &&
      requestedUrl.startsWith(`${globalThis.location.origin}/`) &&
      requestedUrl !== globalThis.location.href
    ) {
      this._redirect(requestedUrl);
    }
  },

  _teardownInactivityTimer() {
    clearTimeout(this._inactivityTimer);
    this._inactivityTimer = null;
    this._inactivityTimeoutMs = 0; // fully disable so an in-flight handler can't re-arm the timer
    this._lastInactivityReset = 0;
    this._inactivityKeepAliveMs = 0;
    this._lastKeepAlive = 0;
    if (this._boundResetInactivityTimer && this._inactivityEvents) {
      this._inactivityEvents.forEach((evt) =>
        globalThis.removeEventListener(evt, this._boundResetInactivityTimer, this._inactivityListenerOptions),
      );
    }
    if (this._boundInactivityStorage) {
      globalThis.removeEventListener('storage', this._boundInactivityStorage);
      this._boundInactivityStorage = null;
    }
    if (this._boundInactivityResume) {
      document.removeEventListener('visibilitychange', this._boundInactivityResume);
      globalThis.removeEventListener('focus', this._boundInactivityResume);
      this._boundInactivityResume = null;
    }
  },
};
