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

/**
 * Anonymous authentication flow (WEBUI-1857).
 *
 * When anonymous authentication is enabled and an anonymous user opens a permalink to a document they
 * are not allowed to read, the document load fails with a 403. Without this behavior the app shows a
 * dead-end "Permission Denied" error page, and the only way forward is to manually log out of the
 * anonymous session, log back in with a real account and open the permalink again.
 *
 * Instead, this behavior detects that specific case (the current user is anonymous AND the failure is a
 * 403) and sends the user through the Nuxeo logout endpoint, preserving the URL they tried to open. The
 * anonymous user has an established (stateful) session, so redirecting straight to `login.jsp` would not
 * help — Nuxeo treats the anonymous user as logged in and bounces back to the requested page. Going
 * through `/logout` invalidates the anonymous session and, because the user was anonymous, Nuxeo forwards
 * to the login form (with `forceAnonymousLogin=true`) while carrying the `requestedUrl` across. After
 * authenticating with a real account the user lands back on the requested document.
 *
 * The Web UI route lives in the URL fragment (e.g. `#!/doc/<uid>`), which browsers do not send to the
 * server, so it is stored in the `nuxeo.start.url.fragment` cookie — the same cookie `nuxeo-connection`
 * uses for its form-auth 401 redirect — and restored by Nuxeo on the post-login redirect.
 *
 * Expects the host to provide a `currentUser` property and a `nxcon` `<nuxeo-connection>` in its
 * template (`this.$.nxcon`), used to resolve the server base URL. Behavior methods are mixed into the
 * host, so the host's `load()` catch can call them directly.
 *
 * @polymerBehavior Nuxeo.AnonymousBehavior
 */
export const NuxeoAnonymousBehavior = {
  /** True when the connected user is the configured anonymous user. */
  _isAnonymousUser() {
    return Boolean(this.currentUser?.isAnonymous);
  },

  /**
   * True when `err` is a 403 raised for an anonymous user, i.e. a permission error that could be
   * resolved by authenticating with a real account.
   */
  _isAnonymousForbidden(err) {
    return this._isAnonymousUser() && Boolean(err) && Number(err.status) === 403;
  },

  /**
   * Send the anonymous user through the logout endpoint (which invalidates the anonymous session and
   * forwards to the login form), preserving the URL they tried to open so that, after logging in with a
   * real account, they are returned to the requested document.
   */
  _redirectAnonymousToLogin() {
    // one-shot guard: a burst of 403s (e.g. document + its enrichers) must not stack redirects
    if (this._anonymousLoginRedirecting) {
      return;
    }
    this._anonymousLoginRedirecting = true;
    // The Web UI route lives in the URL fragment, which is never sent to the server. Nuxeo restores it
    // after login from the `nuxeo.start.url.fragment` cookie: while redirecting an unauthenticated
    // request to the login page, NuxeoAuthenticationFilter emits a script that (re)writes this cookie
    // from `window.location.hash`. We set it here too (mirroring nuxeo-connection's 401 handling), and
    // — crucially — re-append the fragment to the logout URL below so it survives the redirect chain and
    // the server captures the correct value instead of overwriting the cookie with an empty hash.
    // Strip characters that could terminate the cookie value or inject extra cookie attributes.
    // Legitimate Web UI fragments never contain these; a crafted permalink could.
    const fragment = globalThis.location.hash.substring(1).replace(/[;\r\n]/g, '');
    document.cookie = `nuxeo.start.url.fragment=${fragment}; path=/`;
    const baseUrl = this.$?.nxcon?.url || this.url || '';
    // `requestedUrl` must be context-relative: an absolute URL would get the context path prepended by
    // the server, producing a broken redirect. Logging out invalidates the anonymous session and, since
    // the user was anonymous, Nuxeo forwards to `login.jsp?forceAnonymousLogin=true&requestedUrl=...`.
    // Browsers carry a fragment across redirects whose Location has none, so appending it here keeps the
    // requested route alive until the server records it in the cookie.
    const requestedUrl = `${globalThis.location.pathname}${globalThis.location.search}`;
    // `forceAnonymousLogin=true` is required: logging out drops the anonymous session, but anonymous
    // authentication would immediately re-authenticate the follow-up request to `requestedUrl`, bouncing
    // the user straight back to the document and looping. This flag tells Nuxeo to render the login form
    // instead of silently re-authenticating as anonymous. The fragment stays last so it is a valid URL
    // fragment (and is carried across the redirect chain / restored from the cookie after login).
    const logoutUrl = `${baseUrl}/logout?requestedUrl=${encodeURIComponent(
      requestedUrl,
    )}&forceAnonymousLogin=true${globalThis.location.hash}`;
    this._redirect(logoutUrl);
  },

  // Seam for the actual navigation (kept separate so it can be stubbed in tests). Use replace() so the
  // dead-end permission page is not left as a navigable history/bfcache entry after the redirect.
  _redirect(url) {
    globalThis.location.replace(url);
  },
};
