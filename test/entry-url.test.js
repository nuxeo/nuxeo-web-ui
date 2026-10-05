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
      // Changes the address bar, not the destination: `page('/')` matches either way and redirects
      // to `/home`.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123&lang=fr', ''))).to.equal('/nuxeo/ui/#!/?lang=fr');
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?lang=fr', ''))).to.equal('/nuxeo/ui/#!/?lang=fr');
    });

    test('preserves a plain anchor, which page.js does not route on', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#section'))).to.equal('/nuxeo/ui/#section');
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#section'))).to.be.null;
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?q=a%20b', '#section'))).to.be.null;
    });

    test('repairs an address the old page.js behavior already corrupted', () => {
      // Users bookmark and re-share these, so the mangled shapes have to be repaired, not carried on.
      expect(
        normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz?p=permissions?token=abc123')),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?p=permissions');
    });

    test('drops a parameter whose only value still hides a credential', () => {
      // Nothing usable is left, so the route falls back to its default tab instead of a blank page.
      expect(
        normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz?p=permissions%3Ftoken%3Dabc123')),
      ).to.equal('/nuxeo/ui/#!/doc/xyz');
    });

    test('keeps a value that merely reads like a credential when the address carries none', () => {
      // Looks like residue once decoded, but the address carries no `token`, so it is data.
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '', '#!/search/full?q=https%3A%2F%2Fexample.test%2F%3Ftoken%3Dpublic'),
        ),
      ).to.be.null;
    });

    test('keeps a value holding a different credential than the one on the address', () => {
      // A real permalink does carry a token, so presence alone cannot mark the value as residue.
      // Residue repeats the address's own credential; this `q` holds someone else's and is data.
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '?token=abc123', '#!/search/full?q=https%3A%2F%2Fexample.test%2F%3Ftoken%3Dpublic'),
        ),
      ).to.equal('/nuxeo/ui/#!/search/full?q=https%3A%2F%2Fexample.test%2F%3Ftoken%3Dpublic');
    });

    test('keeps an unencoded value that reads like a credential', () => {
      // Only an exact copy of the address's own query string is something page.js appended.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/search/full?q=https://example.test/?token=public'))).to.be
        .null;
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '?token=abc123', '#!/search/full?q=https://example.test/?token=public'),
        ),
      ).to.equal('/nuxeo/ui/#!/search/full?q=https%3A%2F%2Fexample.test%2F%3Ftoken%3Dpublic');
    });

    test('repairs a separator duplicated on every visit', () => {
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '?token=abc123', '#!/doc/xyz?p=permissions?token=abc123?token=abc123'),
        ),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?p=permissions');
    });

    test('removes every appended copy of the query, wherever the token sits in it', () => {
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '?lang=fr&token=abc123', '#!/doc/xyz?p=permissions?lang=fr&token=abc123'),
        ),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?p=permissions&lang=fr');
      expect(
        normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123&lang=fr', '#!/doc/xyz?token=abc123&lang=fr')),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?lang=fr');
    });

    test('keeps route data that matches a query string without a credential', () => {
      // Without a credential there is no evidence page.js appended it, so nothing is removed.
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '?lang=fr', '#!/search/full?q=https://example.test/?lang=fr&sort=date'),
        ),
      ).to.equal('/nuxeo/ui/#!/search/full?q=https%3A%2F%2Fexample.test%2F%3Flang%3Dfr&sort=date&lang=fr');
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?p=metadata', '#!/doc/xyz?p=metadata&p=permissions'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=metadata&p=permissions&p=metadata',
      );
    });

    test('only reads the document tab from a top-level parameter', () => {
      expect(
        normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/search/full?q=https://example.test/?p=metadata?token=public')),
      ).to.be.null;
    });

    test('repairs the document tab after the login redirect dropped the query string', () => {
      // The appended query is read back from the tab, which can never contain a `?` itself.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz?p=permissions?token=abc123'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=permissions',
      );
      expect(
        normalizeEntryUrl(
          location('/nuxeo/ui/', '', '#!/doc/xyz?p=permissions?lang=fr&token=abc123?lang=fr&token=abc123'),
        ),
      ).to.equal('/nuxeo/ui/#!/doc/xyz?p=permissions&lang=fr');
    });

    test('keeps a document tab whose question mark is not followed by a credential', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz?p=a?b'))).to.be.null;
    });

    test('only treats a whole parameter as an appended copy or as residue', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?a=1', '#!/doc/xyz?a=10'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?a=10&a=1',
      );
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=t', '#!/search/full?q=xtoken%3Dt'))).to.equal(
        '/nuxeo/ui/#!/search/full?q=xtoken%3Dt',
      );
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=t', '#!/search/full?q=a%3Ftoken%3Dtt'))).to.equal(
        '/nuxeo/ui/#!/search/full?q=a%3Ftoken%3Dtt',
      );
    });

    test('drops a tab value that still holds the address credential before another question mark', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/doc/xyz?p=perm?token=t?token=t?lang=fr'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz',
      );
    });

    test('handles an arbitrarily long address', () => {
      // A crafted link must not be able to stop the app from starting.
      const long = 'a'.repeat(40000);
      expect(normalizeEntryUrl(location('/nuxeo/ui/', `?token=t&q=${long}`, '#!/doc/xyz'))).to.equal(
        `/nuxeo/ui/#!/doc/xyz?q=${long}`,
      );
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', `#!/doc/xyz?p=perm&token=${long}`))).to.equal(
        '/nuxeo/ui/#!/doc/xyz?p=perm',
      );
    });

    test('matches a credential value that contains regular expression characters', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=a.b*c', '#!/doc/xyz?p=perm%3Ftoken%3Da.b*c'))).to.equal(
        '/nuxeo/ui/#!/doc/xyz',
      );
    });

    test('preserves repeated values of the same parameter', () => {
      // Routes reading a parameter with `getAll()` need every value, so duplicates are not collapsed.
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/custom?tag=a&tag=b'))).to.equal(
        '/nuxeo/ui/#!/custom?tag=a&tag=b',
      );
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#!/custom?tag=a&tag=b'))).to.be.null;
    });

    test('keeps a percent-encoded question mark that is genuinely part of a value', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#!/search/full?q=why%3F'))).to.equal(
        '/nuxeo/ui/#!/search/full?q=why%3F',
      );
    });

    test('keeps a literal question mark that is genuinely part of a value', () => {
      // A `?` is valid inside query data; only an appended copy of the query string is removed.
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
