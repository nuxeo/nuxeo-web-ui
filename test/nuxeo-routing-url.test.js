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
import { restoreQueryDelimiter } from '../elements/routing-url.js';

suite('restoreQueryDelimiter', () => {
  test('restores the `?` Nuxeo encoded when it rebuilt the route after authentication', () => {
    expect(restoreQueryDelimiter('#!/browse/default-domain/workspaces/ws/doc%3Fp=permissions')).to.equal(
      '#!/browse/default-domain/workspaces/ws/doc?p=permissions',
    );
  });

  test('restores a route addressed by document id', () => {
    expect(restoreQueryDelimiter('#!/doc/00000000-0000-0000-0000-000000000000%3Fp=metadata')).to.equal(
      '#!/doc/00000000-0000-0000-0000-000000000000?p=metadata',
    );
  });

  test('accepts the lowercase encoding', () => {
    expect(restoreQueryDelimiter('#!/browse/ws/doc%3fp=view')).to.equal('#!/browse/ws/doc?p=view');
  });

  test('leaves an intact route alone', () => {
    expect(restoreQueryDelimiter('#!/browse/default-domain/workspaces/ws/doc?p=permissions')).to.be.null;
  });

  test('leaves a route with no query alone', () => {
    expect(restoreQueryDelimiter('#!/browse/default-domain/workspaces/ws/doc')).to.be.null;
  });

  test('leaves an escaped `?` that belongs to a document name alone', () => {
    expect(restoreQueryDelimiter('#!/browse/default-domain/workspaces/ws/why%3Fdoc')).to.be.null;
  });

  test('leaves a document name whose escaped `?` is followed by a `key=value` alone', () => {
    expect(restoreQueryDelimiter('#!/browse/default-domain/workspaces/ws/why%3Fsection=1')).to.be.null;
  });

  test('only restores the delimiter when a document name also carries an escaped `?`', () => {
    expect(restoreQueryDelimiter('#!/browse/default-domain/workspaces/ws/why%3Fdoc%3Fp=permissions')).to.equal(
      '#!/browse/default-domain/workspaces/ws/why%3Fdoc?p=permissions',
    );
  });

  test('skips an escaped `?` inside a query value and restores the real delimiter', () => {
    expect(restoreQueryDelimiter('#!/browse/ws/doc%3Fp=permissions&label=why%3Fnow&mode=1')).to.equal(
      '#!/browse/ws/doc?p=permissions&label=why%3Fnow&mode=1',
    );
  });

  test('skips an escaped `?` inside a query value that itself looks like a tab parameter', () => {
    expect(restoreQueryDelimiter('#!/browse/ws/doc%3Fp=permissions&label=why%3Fp=now')).to.equal(
      '#!/browse/ws/doc?p=permissions&label=why%3Fp=now',
    );
  });

  test('skips an escaped `?` in a value whose own remainder parses as a query', () => {
    expect(restoreQueryDelimiter('#!/browse/ws/doc%3Flabel=why%3Fsection=1&p=permissions')).to.equal(
      '#!/browse/ws/doc?label=why%3Fsection=1&p=permissions',
    );
  });

  test('ignores anything that is not a hashbang route', () => {
    expect(restoreQueryDelimiter('#/browse/ws/doc%3Fp=view')).to.be.null;
    expect(restoreQueryDelimiter('')).to.be.null;
    expect(restoreQueryDelimiter(undefined)).to.be.null;
  });
});
