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
import { normalizeCurrentEntryUrl, normalizeEntryUrl } from '../elements/entry-url.js';

suite('entry-url', () => {
  const location = (pathname, search, hash) => {
    return { pathname, search, hash };
  };

  suite('normalizeEntryUrl', () => {
    test('leaves an already normalized url untouched', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/abc'))).to.be.null;
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/abc?p=metadata'))).to.be.null;
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', ''))).to.be.null;
    });

    test('drops the token credential mailed with a transient user permalink', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz'))).to.equal('/nuxeo/ui/#!/doc/xyz');
    });

    test('drops the token credential when it is already inside the route', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz?token=abc123'))).to.equal('/nuxeo/ui/#!/doc/xyz');
    });

    test('keeps the route query intact while dropping the token', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz?p=metadata'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=metadata',
      );
    });

    test('folds a non credential query string onto the route instead of duplicating it', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?p=metadata', '#!/doc/xyz'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=metadata',
      );
    });

    test('merges the query string with the route query', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123&lang=fr', '#!/doc/xyz?p=metadata'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=metadata&lang=fr',
      );
    });

    test('drops the token from a permalink that carries no route', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', ''))).to.equal('/nuxeo/ui/');
    });

    test('moves surviving parameters onto an explicit root route when there is no fragment', () => {
      // This changes the address bar, not the destination: `page('/')` is compiled non-strict, so
      // it matches the empty pathname `Route.match` derives from a query-only route and redirects
      // to `/home` either way. Moving them onto the root route is what clears `location.search`.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123&lang=fr', ''))).to.equal('/nuxeo/ui/#!/?lang=fr');
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?lang=fr', ''))).to.equal('/nuxeo/ui/#!/?lang=fr');
    });

    test('preserves a plain anchor, which page.js does not route on', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#section'))).to.equal('/nuxeo/ui/#section');
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#section'))).to.be.null;
    });

    test('repairs an address the old page.js behavior already corrupted', () => {
      // Users bookmark and re-share these, so the mangled shapes have to be repaired, not carried on.
      expect(
        normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz?p=permissions?token=abc123')),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?p=permissions');
      expect(
        normalizeEntryUrl(
          location(
            '/nuxeo/ui/',
            '?token=abc123',
            '#!/doc/xyz?p=permissions?token=abc123&p=permissions%3Ftoken%3Dabc123',
          ),
        ),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?p=permissions');
    });

    test('drops a parameter whose only value still hides a credential', () => {
      // Nothing usable is left to recover, so the route falls back to its default tab rather than
      // rendering an empty page.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz?p=permissions%3Ftoken%3Dabc123'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz',
      );
    });

    test('recovers the tab without truncating a sibling value that holds a question mark', () => {
      // The separator is identified by the credential that follows it, so the `?` inside
      // `q` is left as data while the one that swallowed the tab name is repaired. Reconstructing
      // the appended query by scanning for the first `?` instead loses `p` and truncates `q`.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz?p=permissions?token=abc123&q=why?now'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=permissions&q=why%3Fnow',
      );
    });

    test('keeps a percent-encoded question mark that is genuinely part of a value', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/search/full?q=why%3F'))).to.equal(
        '/nuxeo/ui/#!/search/full?q=why%3F',
      );
    });

    test('keeps a literal question mark that is genuinely part of a value', () => {
      // A `?` is valid inside query data, so only a `?` followed by a credential is a separator.
      // Both spellings normalize to the same encoded value, which still reads back as `why?now`.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/search/full?q=why?now'))).to.equal(
        '/nuxeo/ui/#!/search/full?q=why%3Fnow',
      );
      expect(new URLSearchParams('q=why%3Fnow').get('q')).to.equal('why?now');
    });

    test('preserves an encoded route path', () => {
      expect(
        normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/browse/default-domain/My%20Folder')),
      ).to.equal('/nuxeo/ui/#!/browse/default-domain/My%20Folder');
    });
  });

  suite('normalizeCurrentEntryUrl', () => {
    test('rewrites the address bar in place, without adding a history entry', () => {
      const history = { replaceState: sinon.spy(), pushState: sinon.spy() };
      const normalized = normalizeCurrentEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz'), history);

      expect(normalized).to.equal('/nuxeo/ui/#!/doc/xyz');
      expect(history.replaceState.calledOnce).to.be.true;
      expect(history.replaceState.firstCall.args[2]).to.equal('/nuxeo/ui/#!/doc/xyz');
      expect(history.pushState.called).to.be.false;
    });

    test('does not touch history when the url is already normalized', () => {
      const history = { replaceState: sinon.spy() };
      expect(normalizeCurrentEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz'), history)).to.be.null;
      expect(history.replaceState.called).to.be.false;
    });
  });
});
