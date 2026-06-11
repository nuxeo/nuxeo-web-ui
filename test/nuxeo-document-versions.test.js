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
import '../elements/nuxeo-document-versions/nuxeo-document-versions.js';

suite('nuxeo-document-versions', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-versions></nuxeo-document-versions>`);
    sinon.stub(element, 'i18n').callsFake((key, ...args) => `${key}${args.length ? `:${args.join(',')}` : ''}`);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'hasPermission').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default versions to empty array', () => {
      expect(element.versions).to.deep.equal([]);
    });

    test('should default page to 1', () => {
      expect(element.page).to.equal(1);
    });

    test('should default pageSize to 100', () => {
      expect(element.pageSize).to.equal(100);
    });
  });

  suite('_isCheckedOut', () => {
    test('should return true for checked out document', () => {
      expect(element._isCheckedOut({ isCheckedOut: true })).to.be.true;
    });

    test('should return false for checked in document', () => {
      expect(element._isCheckedOut({ isCheckedOut: false })).to.be.false;
    });

    test('should return falsy for null', () => {
      expect(element._isCheckedOut(null)).to.not.be.ok;
    });
  });

  suite('_labelCreate', () => {
    test('should return create label for versionable doc with WriteVersion', () => {
      const doc = { uid: '1' };
      element.hasFacet.withArgs(doc, 'Versionable').returns(true);
      element.hasPermission.withArgs(doc, 'WriteVersion').returns(true);
      const label = element._labelCreate(doc);
      expect(label).to.include('versions.create');
    });
  });

  suite('_labelCheckedOut', () => {
    test('should return + for checked out document', () => {
      expect(element._labelCheckedOut({ isCheckedOut: true })).to.equal('+');
    });

    test('should return empty string for checked in document', () => {
      expect(element._labelCheckedOut({ isCheckedOut: false })).to.equal('');
    });
  });

  suite('_labelTitle', () => {
    test('should return formatted version string', () => {
      const doc = { properties: { 'uid:major_version': 2, 'uid:minor_version': 3 } };
      const result = element._labelTitle(doc);
      expect(result).to.include('versions.version');
    });

    test('should return empty string for null doc', () => {
      expect(element._labelTitle(null)).to.equal('');
    });
  });

  suite('_labelLatest', () => {
    test('should include latest label when not checked out', () => {
      const doc = {
        isCheckedOut: false,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      const result = element._labelLatest(doc);
      expect(result).to.include('versions.latest');
      expect(result).to.include('versions.version');
    });

    test('should include unversionedChanges label when checked out', () => {
      const doc = {
        isCheckedOut: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      const result = element._labelLatest(doc);
      expect(result).to.include('versions.unversionedChanges');
    });

    test('should return empty string and hide list when doc is null', () => {
      sinon.stub(element, '_hideList');
      expect(element._labelLatest(null)).to.equal('');
      expect(element._hideList).to.have.been.calledOnce;
      element._hideList.restore();
    });
  });

  suite('_labelModified', () => {
    test('should return i18n modified string', () => {
      const doc = { properties: { 'dc:modified': '2024-01-01', 'dc:lastContributor': 'admin' } };
      const result = element._labelModified(doc);
      expect(result).to.include('versions.modified');
    });
  });

  suite('_labelCreate', () => {
    test('should return unversioned label when not versionable', () => {
      const doc = { uid: '1' };
      element.isVersion.returns(false);
      element.hasFacet.withArgs(doc, 'Versionable').returns(false);
      const label = element._labelCreate(doc);
      expect(label).to.include('versions.unversioned');
    });

    test('should return unversioned label when no WriteVersion permission', () => {
      const doc = { uid: '1' };
      element.hasFacet.withArgs(doc, 'Versionable').returns(true);
      element.hasPermission.withArgs(doc, 'WriteVersion').returns(false);
      const label = element._labelCreate(doc);
      expect(label).to.include('versions.unversioned');
    });
  });

  suite('_showList and _hideList', () => {
    test('_showList should call list.open', () => {
      sinon.stub(element.$.list, 'open');
      element._showList();
      expect(element.$.list.open).to.have.been.calledOnce;
      element.$.list.open.restore();
    });

    test('_hideList should call list.close', () => {
      sinon.stub(element.$.list, 'close');
      element._hideList();
      expect(element.$.list.close).to.have.been.calledOnce;
      element.$.list.close.restore();
    });
  });

  suite('_query', () => {
    test('should set provider params and reset page', () => {
      sinon.stub(element.$.scrollThreshold, 'clearTriggers');
      sinon.stub(element.$.provider, 'fetch').resolves({ entries: [] });
      Object.defineProperty(element.$.provider, 'isNextPageAvailable', { value: false, configurable: true });
      element._query('abc123');
      expect(element.$.provider.params).to.deep.equal(['abc123']);
      expect(element.$.provider.provider).to.equal('document_versions');
      expect(element.page).to.be.above(0);
    });
  });
});
