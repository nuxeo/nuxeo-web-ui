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

/** The document tab parameter, and the query appended to its value. Tab names never contain `?`. */
const TAB_PARAM = 'p';
const APPENDED_TO_TAB = new RegExp(String.raw`[?&]${TAB_PARAM}=[^&?]*(\?[^?]*)`);

/**
 * Remove every copy of `copy` from `query` that ends a parameter, i.e. is followed by `&`, `?` or
 * the end. Plain string matching, not a regular expression built from the text: the URL can be
 * arbitrarily long.
 *
 * @param {string} query the raw query
 * @param {string} copy the raw text to remove
 * @return {string} the query without those copies
 */
function removeCopies(query, copy) {
  const [head, ...rest] = query.split(copy);
  return rest.reduce((result, part) => result + (part === '' || '&?'.includes(part[0]) ? '' : copy) + part, head);
}

/**
 * Whether a decoded value embeds this address's own credential, as page.js residue does.
 * `permissions?token=<t>` is residue, but `https://example.test/?token=public` is data: only the
 * former repeats the address's credential.
 *
 * @param {string} value the decoded parameter value
 * @param {string[]} credentials the credential values found on the address
 * @return {boolean} whether the value is residue
 */
function repeatsCredential(value, credentials) {
  const assignments = CREDENTIAL_PARAMS.flatMap((param) => credentials.map((credential) => `${param}=${credential}`));
  const startsParameter = (start, assignment) => {
    const end = start + assignment.length;
    return value.startsWith(assignment, start) && (end === value.length || value[end] === '&');
  };
  for (let i = 0; i < value.length; i++) {
    if (
      (value[i] === '?' || value[i] === '&') &&
      assignments.some((assignment) => startsParameter(i + 1, assignment))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The query page.js appended to the route on earlier visits. It is `location.search`, unless the
 * server's login redirect has since dropped that: then it can still be read from the document tab,
 * where it starts at the `?` a tab name never contains, but only when it carries a credential.
 *
 * @param {string} search the raw `location.search`
 * @param {string} routeQuery the raw route query, `?` included
 * @return {string} the raw appended query, `?` included, or `''`
 */
function appendedQuery(search, routeQuery) {
  if (search) {
    return search;
  }
  const candidate = APPENDED_TO_TAB.exec(routeQuery)?.[1] ?? '';
  const params = new URLSearchParams(candidate);
  return CREDENTIAL_PARAMS.some((param) => params.has(param)) ? candidate : '';
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
  // page.js appended the raw `location.search` to the route on every visit. Users bookmark and
  // re-share those addresses, so every copy is removed and the query is merged back once.
  const routeQuery = queryIndex > -1 ? route.slice(queryIndex) : '';
  const appended = appendedQuery(search, routeQuery);
  const params = new URLSearchParams(appended ? removeCopies(routeQuery, appended) : routeQuery);
  new URLSearchParams(appended).forEach((value, key) => params.append(key, value));

  // Re-serializing an already-clean URL would needlessly rewrite its percent-encoding, so bail out
  // unless there is a credential to drop or a query string to fold onto a route. A plain anchor has
  // no route to fold onto.
  const credentials = CREDENTIAL_PARAMS.flatMap((param) => params.getAll(param));
  const foldsQuery = appended && (isRoute || !hash);
  if (!foldsQuery && !credentials.length) {
    return null;
  }
  CREDENTIAL_PARAMS.forEach((param) => params.delete(param));

  // Repeated keys are kept, in order, because a route may read them with `getAll()`. A value that
  // repeats this address's own credential is corruption residue and is dropped; any other value is
  // data and survives untouched.
  const residue = credentials.filter(Boolean);
  const kept = [...params].filter(([, value]) => !repeatsCredential(value, residue));
  const query = new URLSearchParams(kept).toString();
  const suffix = query ? `?${query}` : '';
  let normalized;
  if (isRoute) {
    normalized = `${pathname}#!${routePath}${suffix}`;
  } else if (hash) {
    // A plain anchor is not a route, so there is nowhere to move the query onto: keep both as they are.
    normalized = `${pathname}${suffix}${hash}`;
  } else {
    // No fragment at all. `page('/')` matches the empty pathname either way and redirects to
    // `/home`, so this does not change where the app lands — it clears the address bar.
    normalized = query ? `${pathname}#!/${suffix}` : pathname;
  }
  return normalized;
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
