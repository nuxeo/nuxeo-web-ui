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
import {
  applySavedChangeToken,
  createDirtyDocument,
  detachDirtyBatch,
  markSaveError,
  restoreUnsavedRow,
  stampChangeToken,
} from '../addons/nuxeo-spreadsheet/app/ui/optimistic-locking.js';

suite('nuxeo-spreadsheet optimistic locking', () => {
  test('copies the loaded change token into the update payload', () => {
    expect(createDirtyDocument({ uid: 'doc-1', changeToken: '3-1' })).to.deep.equal({
      'entity-type': 'document',
      uid: 'doc-1',
      changeToken: '3-1',
    });
  });

  test('omits the token when optimistic locking is disabled', () => {
    expect(createDirtyDocument({ uid: 'doc-1' })).to.deep.equal({
      'entity-type': 'document',
      uid: 'doc-1',
    });
  });

  test('marks a stale-write error as a conflict', () => {
    const dirtyDocument = { uid: 'doc-1' };
    const error = { status: 409 };

    expect(markSaveError(dirtyDocument, error)).to.be.true;
    expect(dirtyDocument._error).to.equal(error);
  });

  test('retains other save errors without calling them conflicts', () => {
    const dirtyDocument = { uid: 'doc-1' };
    const error = { status: 500 };

    expect(markSaveError(dirtyDocument, error)).to.be.false;
    expect(dirtyDocument._error).to.equal(error);
  });

  test('adopts the token the server returned for a saved row', () => {
    const row = { uid: 'doc-1', changeToken: '3-1' };

    applySavedChangeToken(row, { uid: 'doc-1', changeToken: '4-2' });

    expect(row.changeToken).to.equal('4-2');
  });

  test('leaves the row alone when the response carries no token', () => {
    const row = { uid: 'doc-1', changeToken: '3-1' };

    applySavedChangeToken(row, { uid: 'doc-1' });
    applySavedChangeToken(row, undefined);

    expect(row.changeToken).to.equal('3-1');
  });

  test('tolerates a row that is no longer loaded', () => {
    expect(() => applySavedChangeToken(undefined, { changeToken: '4-2' })).to.not.throw();
  });

  test('lets the same row be edited twice without a false conflict', () => {
    // The spreadsheet never refetches after saving, so the second edit has to pick up the token
    // the first save returned — otherwise the server rejects it as a stale write.
    const row = { uid: 'doc-1', changeToken: '3-1' };

    expect(createDirtyDocument(row).changeToken).to.equal('3-1');
    applySavedChangeToken(row, { uid: 'doc-1', changeToken: '4-2' });

    expect(createDirtyDocument(row).changeToken).to.equal('4-2');
  });

  test('a payload is stamped with the token the row holds when it is submitted', () => {
    // The payload is built when the cell is edited but sent later. If an earlier save lands in
    // between, the token it brought back is the one this payload has to carry.
    const row = { uid: 'doc-1', changeToken: '3-1' };
    const dirtyDocument = createDirtyDocument(row);

    applySavedChangeToken(row, { changeToken: '4-2' });

    expect(stampChangeToken(dirtyDocument, row).changeToken).to.equal('4-2');
  });

  test('stamping leaves the payload untouched when the row is gone or has no token', () => {
    expect(stampChangeToken({ uid: 'doc-1' }, undefined)).to.deep.equal({ uid: 'doc-1' });
    expect(stampChangeToken({ uid: 'doc-1' }, { uid: 'doc-1' })).to.deep.equal({ uid: 'doc-1' });
  });

  test('detaching a batch empties the dirty set and hands over the payloads', () => {
    const payload = { uid: 'doc-1' };
    const dirty = { 'doc-1': payload };

    expect(detachDirtyBatch(dirty)).to.deep.equal([['doc-1', payload]]);
    expect(dirty).to.deep.equal({});
  });

  test('an edit made during a save is kept rather than cleared with the request', () => {
    // onChange reuses whatever entry it finds for a row. Detaching the batch is what stops the
    // edit from mutating a payload already on the wire and then vanishing with it.
    const row = { uid: 'doc-1', changeToken: '3-1' };
    const dirty = { 'doc-1': createDirtyDocument(row) };

    const [[, submitted]] = detachDirtyBatch(dirty);

    // the user types again while the request is in flight
    const reopened = (dirty['doc-1'] = dirty['doc-1'] || createDirtyDocument(row));
    reopened['dc:title'] = 'edited during save';

    expect(reopened, 'the later edit must not touch the payload already sent').to.not.equal(submitted);
    expect(dirty['doc-1']['dc:title']).to.equal('edited during save');
  });

  test('a failed payload goes back to the dirty set so the row is retried', () => {
    const dirty = {};
    const failed = { uid: 'doc-1', 'dc:title': 'first' };
    markSaveError(failed, { status: 409 });

    restoreUnsavedRow(dirty, 'doc-1', failed);

    expect(dirty['doc-1']).to.equal(failed);
    expect(dirty['doc-1']._error).to.deep.equal({ status: 409 });
  });

  test('a newer edit outranks the payload that failed but inherits its error', () => {
    const failed = { uid: 'doc-1', 'dc:title': 'first', 'dc:description': 'kept' };
    markSaveError(failed, { status: 409 });
    const dirty = { 'doc-1': { uid: 'doc-1', 'dc:title': 'typed during the save' } };

    restoreUnsavedRow(dirty, 'doc-1', failed);

    expect(dirty['doc-1']['dc:title'], 'the newer value wins').to.equal('typed during the save');
    expect(dirty['doc-1']['dc:description'], 'the failed value is still retried').to.equal('kept');
    expect(dirty['doc-1']._error, 'the row stays flagged as failed').to.deep.equal({ status: 409 });
  });
});
