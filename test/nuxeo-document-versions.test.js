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

    test('should default page to 0', () => {
      expect(element.page).to.equal(0);
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
});
