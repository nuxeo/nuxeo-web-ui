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

const ENCODED_QUESTION_MARK = '%3f';

/**
 * What a route's query looks like once the delimiter is put back: a `key=value` pair with no
 * intervening `/`. Requiring it keeps an escaped `?` that belongs to a document name — Nuxeo allows
 * one, and `router.browse()` escapes it exactly the same way — from being read as the delimiter.
 */
const QUERY_SHAPED = /^[^=/]*=/;

/**
 * WEBUI-2376: repairs the query delimiter of a Web UI route that came back percent-encoded.
 *
 * A Web UI route lives in the URL fragment (`#!/browse/<path>?p=permissions`), which browsers never
 * send to the server. When an unauthenticated user opens such a link, Nuxeo stashes the fragment in
 * the `nuxeo.start.url.fragment` cookie and, after authentication, rebuilds the redirect with
 * `UriBuilder.fragment()`. That encodes the `?` to `%3F` even though RFC 3986 allows it in a
 * fragment, so the user lands on `#!/browse/<path>%3Fp=permissions`. The router is started with
 * `decodeURLComponents: false`, so it reads the whole thing as a document path and renders
 * "404 Not Found" instead of the requested document and tab.
 *
 * Returns the repaired route, or `null` when there is nothing to repair — which is the common case:
 * a route that still carries a literal `?` reached us intact and must be left alone.
 *
 * @param {string} route the URL fragment, including its leading `#`
 * @return {?string} the repaired fragment, or `null`
 */
export function restoreQueryDelimiter(route) {
  if (typeof route !== 'string' || !route.startsWith('#!') || route.includes('?')) {
    return null;
  }
  // Scan from the end, because when a document name carries an escaped `?` of its own only the
  // trailing candidate is the delimiter. The leading `#!` means index 0 is never a candidate.
  const probe = route.toLowerCase();
  for (let i = probe.lastIndexOf(ENCODED_QUESTION_MARK); i > 0; i = probe.lastIndexOf(ENCODED_QUESTION_MARK, i - 1)) {
    const query = route.slice(i + ENCODED_QUESTION_MARK.length);
    if (QUERY_SHAPED.test(query)) {
      return `${route.slice(0, i)}?${query}`;
    }
  }
  return null;
}
