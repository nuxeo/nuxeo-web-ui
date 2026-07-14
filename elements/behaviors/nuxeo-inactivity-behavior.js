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
    // Throttle re-arming so continuous events (e.g. mousemove) don't clear/set the timer on every tick.
    const now = Date.now();
    if (this._lastInactivityReset && now - this._lastInactivityReset < 1000) {
      return;
    }
    this._lastInactivityReset = now;
    this._lastActivityTs = now; // local fallback reference when localStorage is unavailable
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
    let shared = 0;
    try {
      shared = Number(globalThis.localStorage.getItem(INACTIVITY_ACTIVITY_KEY)) || 0;
    } catch (e) {
      // localStorage unavailable; rely on this tab's local reference below.
      this._inactivityStorageError = e;
    }
    return Math.max(shared, this._lastActivityTs || 0);
  },

  // Another tab recorded activity — re-arm this (possibly idle) tab without re-broadcasting.
  _onInactivityStorage(e) {
    if (e?.key === INACTIVITY_ACTIVITY_KEY && e.newValue) {
      this._lastInactivityReset = 0; // bypass throttle so the remote activity always re-arms us
      this._resetInactivityTimer(false);
    }
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
      this._logoutRedirect();
      return;
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
    // A tab may have been active while this one sat idle; only log out if every tab has been idle.
    // Keyed off the shared (cross-tab) timestamp: this tab's own timer already elapsed, so its local
    // activity is by definition older than the timeout — what matters is whether another tab was active.
    let lastActivity = 0;
    try {
      lastActivity = Number(globalThis.localStorage.getItem(INACTIVITY_ACTIVITY_KEY)) || 0;
    } catch (e) {
      // localStorage unavailable; no cross-tab signal, so fall through to a per-tab logout.
      this._inactivityStorageError = e;
    }
    // Clamp to >= 0 for the same clock-skew reason as _checkInactivityOnResume(): a future lastActivity
    // must not extend the effective inactivity window beyond the configured timeout.
    const idleFor = Math.max(0, Date.now() - lastActivity);
    if (lastActivity && idleFor < this._inactivityTimeoutMs) {
      // Someone was active recently (in another tab); re-arm for the remaining time instead of logging out.
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), this._inactivityTimeoutMs - idleFor);
      return;
    }
    this._logoutRedirect();
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
  _logoutRedirect() {
    if (this._loggingOut) {
      return;
    }
    this._loggingOut = true;
    this._redirect(this._logout());
  },

  // Use replace() (not href) so the potentially sensitive page is not left as a navigable
  // history/bfcache entry after an inactivity-driven logout.
  _redirect(url) {
    globalThis.location.replace(url);
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
