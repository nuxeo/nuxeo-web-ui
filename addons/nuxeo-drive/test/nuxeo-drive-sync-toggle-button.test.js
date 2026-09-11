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
import { fixture, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-drive-sync-toggle-button.js';

suite('nuxeo-drive-sync-toggle-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-drive-sync-toggle-button></nuxeo-drive-sync-toggle-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_icon', () => {
    test('should return sync-disabled when synchronized', () => {
      expect(element._icon(true)).to.equal('notification:sync-disabled');
    });

    test('should return sync when not synchronized', () => {
      expect(element._icon(false)).to.equal('notification:sync');
    });
  });

  suite('_computeLabel', () => {
    test('should return unsync label when synchronized', () => {
      const label = element._computeLabel(true);
      expect(label).to.include('unsync');
    });

    test('should return sync label when not synchronized', () => {
      const label = element._computeLabel(false);
      expect(label).to.include('sync');
    });
  });

  suite('_isAvailable', () => {
    test('should return false when no document', () => {
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false for version documents', () => {
      element.document = { uid: '1', type: 'File' };
      element.isVersion.returns(true);
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false for excluded doctypes', () => {
      element.document = { uid: '1', type: 'Domain' };
      expect(element._isAvailable()).to.be.false;
    });
  });

  // Kept last: `_handleRoots` writes the module-level sync-root cache that `_update`
  // reads, so these tests leave state behind that the suites above must not see.
  suite('_update', () => {
    function documentWithBreadcrumb(uid, parentRefs) {
      const entries = parentRefs.map((parentRef) => {
        return { parentRef };
      });
      return { uid, type: 'Folder', contextParameters: { breadcrumb: { entries } } };
    }

    function receiveRoots(uids) {
      const entries = uids.map((uid) => {
        return { uid };
      });
      element._handleRoots({ detail: { response: { entries } } });
    }

    teardown(() => {
      receiveRoots([]);
    });

    test('should mark the document synchronized when it is itself a sync root', () => {
      element.document = documentWithBreadcrumb('doc-1', ['root']);

      receiveRoots(['doc-1']);

      expect(element.synchronized).to.be.true;
    });

    test('should resolve the closest synchronized ancestor as the synchronization root', () => {
      element.document = documentWithBreadcrumb('doc-1', ['root', 'ws-1']);

      receiveRoots(['root', 'ws-1']);

      // The breadcrumb is walked from the closest ancestor outwards, so `ws-1` wins over `root`.
      expect(element.synchronizationRoot).to.equal('ws-1');
    });

    test('should clear the synchronization root when no ancestor is synchronized', () => {
      element.document = documentWithBreadcrumb('doc-2', ['root', 'ws-1']);

      receiveRoots(['unrelated']);

      expect(element.synchronized).to.be.false;
      expect(element.synchronizationRoot).to.be.null;
    });
  });
});
