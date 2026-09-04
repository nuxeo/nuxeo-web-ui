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
import { createDirtyDocument, markSaveError } from '../addons/nuxeo-spreadsheet/app/ui/optimistic-locking.js';

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
});
