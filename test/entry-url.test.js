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
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123&lang=fr', ''))).to.equal('/nuxeo/ui/?lang=fr');
    });

    test('preserves a plain anchor, which page.js does not route on', () => {
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '?token=abc123', '#section'))).to.equal('/nuxeo/ui/#section');
      expect(normalizeEntryUrl(location('/nuxeo/ui/', '', '#section'))).to.be.null;
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
