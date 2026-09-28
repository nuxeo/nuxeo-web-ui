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
 * Normalization of the URL the app is entered with, before page.js starts routing (WEBUI-2316).
 *
 * Nuxeo mails transient ("external") users a document permalink whose authentication token is added
 * with `UriBuilder.queryParam`, which places it in the query component — ahead of the fragment:
 *
 *     /nuxeo/ui/?token=<t>#!/doc/<uid>
 *
 * page.js runs in hashbang mode, where the route and its query both live in the fragment. On start
 * it appends `location.search` to the route by plain string concatenation and then writes the
 * result back with a *relative* `#!<route>` `replaceState`, which only replaces the fragment. The
 * original `location.search` therefore survives, and the same parameters end up in the address bar
 * twice. Worse, when the route already carries a query the concatenation produces a second `?`
 * inside it (`#!/doc/<uid>?p=metadata?token=<t>`), so `p` parses as `metadata?token=<t>` and the
 * requested document tab is never selected.
 *
 * `normalizeEntryUrl` collapses this into a single, well-formed query string on the route and drops
 * the spent `token` credential, which the server has already consumed from the request and which
 * must not linger in the address bar, the session history, or a link the user copies.
 */

/**
 * Query parameters the server authenticates the request with. They are single-use as far as the
 * client is concerned — the session cookie carries authentication from the first response onwards,
 * and `<nuxeo-connection>` never reads them — so they are removed rather than moved onto the route.
 */
const CREDENTIAL_PARAMS = ['token'];

/** Matches a credential parameter embedded in a value, i.e. the residue of an earlier corruption. */
const EMBEDDED_CREDENTIAL = new RegExp(`[?&](?:${CREDENTIAL_PARAMS.join('|')})=`);

/**
 * Matches only the `?` that page.js left behind when it appended `location.search` to a route that
 * already carried a query. A literal `?` is valid inside query data, so it is not enough that one is
 * present: the separator is identified by the credential assignment that immediately follows it,
 * which is the shape this bug produced. Anything else is left as data.
 */
const DUPLICATED_CREDENTIAL_SEPARATOR = new RegExp(String.raw`\?(?=(?:${CREDENTIAL_PARAMS.join('|')})=)`, 'g');

/**
 * Parse a query string that a previous visit may already have corrupted. Users bookmark and
 * re-share the addresses this bug produced, so those shapes have to be repaired rather than carried
 * forward.
 */
function parseQuery(query) {
  return new URLSearchParams(query.replace(DUPLICATED_CREDENTIAL_SEPARATOR, '&'));
}

/**
 * Compute the URL the app should start from, given the current `location` parts.
 *
 * @param {{pathname: string, search: string, hash: string}} location the current location parts
 * @return {?string} the normalized `pathname[?search][#hash]`, or `null` when the URL is already
 *     normalized and must be left untouched.
 */
export function normalizeEntryUrl({ pathname, search, hash }) {
  // Only a hashbang route can hold the app's query string. Any other fragment is a plain anchor:
  // page.js does not route on it, so there is nowhere to move the query to and we leave it alone.
  const isRoute = hash.startsWith('#!');
  const route = isRoute ? hash.slice(2) : '';
  const queryIndex = route.indexOf('?');
  const routePath = queryIndex > -1 ? route.slice(0, queryIndex) : route;

  // The parameters that survive normalization, and where they end up: on the route when there is
  // one (page.js would fold them there anyway, just malformed), otherwise back on `location.search`.
  const routeQuery = queryIndex > -1 ? route.slice(queryIndex + 1) : '';
  const params = parseQuery(isRoute ? routeQuery : search);
  if (isRoute) {
    parseQuery(search).forEach((value, key) => params.append(key, value));
  }

  // Re-serializing an already-clean URL would needlessly rewrite its percent-encoding, so bail out
  // unless there is a query string to fold onto the route or a credential to drop. A credential can
  // also be hiding percent-encoded inside a value, left there by an address this bug already broke.
  const hasCredential =
    CREDENTIAL_PARAMS.some((param) => params.has(param)) ||
    [...params].some(([, value]) => EMBEDDED_CREDENTIAL.test(value));
  if (!search && !hasCredential) {
    return null;
  }
  CREDENTIAL_PARAMS.forEach((param) => params.delete(param));

  // Keep the first value of each parameter, and discard any value that still carries a credential
  // inside it — an already-corrupted address holds the usable value first and the mangled copy
  // after. Every route reads its parameters with `URLSearchParams.get()`, which returns the first
  // value, so collapsing the duplicates changes nothing except that the address bar comes out clean.
  const query = [...params]
    .filter(([, value]) => !EMBEDDED_CREDENTIAL.test(value))
    .reduce((deduped, [key, value]) => {
      if (!deduped.has(key)) {
        deduped.set(key, value);
      }
      return deduped;
    }, new URLSearchParams())
    .toString();
  const suffix = query ? `?${query}` : '';
  let normalized;
  if (isRoute) {
    normalized = `${pathname}#!${routePath}${suffix}`;
  } else if (hash) {
    // A plain anchor is not a route, so there is nowhere to move the query onto: keep both as they are.
    normalized = `${pathname}${suffix}${hash}`;
  } else {
    // No fragment at all. Parameters cannot be left in `location.search` either, because page.js
    // reads the route from the fragment and falls back to `location.search` as the route itself, so
    // `?lang=fr` would be dispatched as the path `?lang=fr` and end on the 404 handler. Put them on
    // an explicit root route instead, which keeps them addressable and lets the root handler run.
    normalized = query ? `${pathname}#!/${suffix}` : pathname;
  }
  return normalized === `${pathname}${search}${hash}` ? null : normalized;
}

/**
 * Apply `normalizeEntryUrl` to the current address bar. Must run before page.js starts, so that it
 * never sees — and never duplicates — a query string outside the route.
 *
 * `replaceState` is used rather than a navigation: it rewrites the address bar in place, without
 * adding a history entry the user could go "back" to and without re-triggering the token request.
 */
export function normalizeCurrentEntryUrl(location = globalThis.location, history = globalThis.history) {
  const normalized = normalizeEntryUrl(location);
  if (normalized != null) {
    history.replaceState(null, document.title, normalized);
  }
  return normalized;
}
