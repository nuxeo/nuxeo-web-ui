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
import '../elements/nuxeo-wopi-link.js';

suite('nuxeo-wopi-link', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-wopi-link></nuxeo-wopi-link>`);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('_appName', () => {
    test('should return lowercase app name from blob', () => {
      element.blob = { wopi: { appName: 'Word' } };
      expect(element._appName()).to.equal('word');
    });

    test('should return falsy when blob has no wopi', () => {
      element.blob = {};
      expect(element._appName()).to.not.be.ok;
    });

    test('should return falsy when blob is null', () => {
      element.blob = null;
      expect(element._appName()).to.not.be.ok;
    });
  });

  suite('_isAvailable', () => {
    test('should return true when url is set', () => {
      element.document = { uid: '1' };
      element.blob = { wopi: { edit: 'https://example.com/wopi', view: 'https://view.com' } };
      expect(element._isAvailable()).to.be.true;
    });

    test('should return false when url is empty', () => {
      element.document = { uid: '1' };
      element.blob = {};
      expect(element._isAvailable()).to.be.false;
    });
  });

  suite('_wopiURL', () => {
    test('should return edit URL when user has WriteProperties', () => {
      const doc = { uid: '1' };
      const blob = { wopi: { edit: 'https://edit.com', view: 'https://view.com' } };
      element.document = doc;
      element.blob = blob;
      element.hasPermission.withArgs(doc, 'WriteProperties').returns(true);
      expect(element._wopiURL()).to.equal('https://edit.com');
    });

    test('should return view URL when user lacks WriteProperties', () => {
      const doc = { uid: '1' };
      const blob = { wopi: { edit: 'https://edit.com', view: 'https://view.com' } };
      element.document = doc;
      element.blob = blob;
      expect(element._wopiURL()).to.equal('https://view.com');
    });

    test('should return null when blob has no wopi info', () => {
      element.document = { uid: '1' };
      element.blob = {};
      expect(element._wopiURL()).to.not.be.ok;
    });
  });
});
