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
import '../elements/nuxeo-publication/nuxeo-internal-publish.js';

const fullDoc = {
  uid: 'doc-1',
  title: 'Test Doc',
  type: 'File',
  properties: {
    'uid:major_version': 1,
    'uid:minor_version': 0,
  },
};

suite('nuxeo-internal-publish', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-internal-publish></nuxeo-internal-publish>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default selectedRendition to default', () => {
      expect(element.selectedRendition).to.equal('default');
    });

    test('should default _isDisable to false', () => {
      expect(element._isDisable).to.be.false;
    });

    test('should default showRendition to false', () => {
      expect(element.showRendition).to.be.false;
    });
  });

  suite('_computeMultiple', () => {
    test('should return true when documents array has items', () => {
      // Set document first to avoid _input crash, then set documents
      element.document = fullDoc;
      element.documents = [fullDoc];
      expect(element._computeMultiple()).to.be.true;
    });

    test('should return false when no documents set', () => {
      expect(element._computeMultiple()).to.be.false;
    });
  });

  suite('_canPublish', () => {
    test('should return false when publishSpace is null', () => {
      element.publishSpace = null;
      expect(element._canPublish()).to.be.false;
    });

    test('should return false when publishSpace lacks AddChildren permission', () => {
      element.publishSpace = { contextParameters: { permissions: ['Read'] } };
      expect(element._canPublish()).to.be.false;
    });

    test('should return true when publishSpace has AddChildren permission', () => {
      element.publishSpace = { contextParameters: { permissions: ['AddChildren'] } };
      element.hasPermission.withArgs(sinon.match.any, 'AddChildren').returns(true);
      expect(element._canPublish()).to.be.true;
    });
  });

  suite('_cancel', () => {
    test('should fire cancel event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element._cancel();
      expect(fireSpy).to.have.been.calledWith('cancel');
    });
  });

  suite('_computeRenditionOptions', () => {
    test('should return at least 2 default options', () => {
      const options = element._computeRenditionOptions();
      expect(options).to.be.an('array');
      expect(options.length).to.be.at.least(2);
    });
  });

  suite('_targetFormatter', () => {
    test('should return escaped document title', () => {
      const doc = { title: 'My Doc' };
      const result = element._targetFormatter(doc);
      expect(result).to.be.a('string');
      expect(result).to.include('My');
    });
  });
});
