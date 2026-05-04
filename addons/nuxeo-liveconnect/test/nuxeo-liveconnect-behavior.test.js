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
import { LiveConnectBehavior } from '../elements/nuxeo-liveconnect-behavior.js';

suite('LiveConnectBehavior', () => {
  let behavior;

  setup(() => {
    // Create a plain object mixing in the behavior for direct method testing
    behavior = Object.create(LiveConnectBehavior);
    behavior.fire = sinon.spy();
  });

  suite('generateBlobKey', () => {
    test('should generate key from providerId, userId, and fileId', () => {
      behavior.providerId = 'googledrive';
      behavior.userId = 'user1';
      const key = behavior.generateBlobKey('file123');
      expect(key).to.equal('googledrive:user1:file123');
    });

    test('should throw when providerId is not defined', () => {
      behavior.providerId = null;
      behavior.userId = 'user1';
      expect(() => behavior.generateBlobKey('file123')).to.throw('providerId not defined');
    });

    test('should throw when userId is not defined', () => {
      behavior.providerId = 'googledrive';
      behavior.userId = null;
      expect(() => behavior.generateBlobKey('file123')).to.throw('userId not defined');
    });

    test('should throw when fileId is not defined', () => {
      behavior.providerId = 'googledrive';
      behavior.userId = 'user1';
      expect(() => behavior.generateBlobKey(null)).to.throw('fileId not defined');
    });
  });

  suite('notifyBlobPick', () => {
    test('should fire nx-blob-picked with array of blobs', () => {
      const blobs = [{ name: 'file1' }, { name: 'file2' }];
      behavior.notifyBlobPick(blobs);
      expect(behavior.fire).to.have.been.calledWith('nx-blob-picked', { blobs });
    });

    test('should wrap single blob in array', () => {
      const blob = { name: 'file1' };
      behavior.notifyBlobPick(blob);
      expect(behavior.fire).to.have.been.calledWith('nx-blob-picked', { blobs: [blob] });
    });
  });

  suite('openPicker', () => {
    test('should throw not implemented', () => {
      expect(() => behavior.openPicker()).to.throw('not implemented');
    });
  });
});
