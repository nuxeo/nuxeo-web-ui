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
import '../elements/nuxeo-document-storage/nuxeo-document-storage.js';

suite('nuxeo-document-storage', () => {
  let server;
  let element;

  const doc = (uid, extra = {}) => {
    return {
      'entity-type': 'document',
      uid,
      path: `/default-domain/${uid}`,
      repository: 'default',
      title: `Doc ${uid}`,
      type: 'File',
      ...extra,
    };
  };

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-storage name="test-storage"></nuxeo-document-storage>`);
  });

  teardown(() => {
    server.restore();
  });

  suite('add', () => {
    test('should add a document to an empty list', () => {
      element.documents = [];
      element.add(doc('1'));
      expect(element.documents).to.have.lengthOf(1);
      expect(element.documents[0].uid).to.equal('1');
    });

    test('should prepend documents (most recent first)', () => {
      element.documents = [];
      element.add(doc('1'));
      element.add(doc('2'));
      expect(element.documents.map((d) => d.uid)).to.deep.equal(['2', '1']);
    });

    test('should not add a duplicate document', () => {
      element.documents = [doc('1')];
      element.add(doc('1'));
      expect(element.documents).to.have.lengthOf(1);
    });

    test('should copy the proxy flag into the stored document', () => {
      element.documents = [];
      element.add(doc('1', { isProxy: true }));
      expect(element.documents[0].isProxy).to.be.true;
    });

    test('should store a non-proxy document as not a proxy', () => {
      element.documents = [];
      element.add(doc('1'));
      expect(element.documents[0].isProxy).to.be.false;
    });

    test('should keep only whitelisted thumbnail context parameters', () => {
      element.documents = [];
      element.add(doc('1', { contextParameters: { thumbnail: { url: 'http://x/thumb.png' }, extra: 'drop' } }));
      expect(element.documents[0].contextParameters).to.deep.equal({ thumbnail: { url: 'http://x/thumb.png' } });
    });

    test('should not throw and should initialize the list when documents is null', () => {
      element.documents = null;
      expect(() => element.add(doc('1'))).to.not.throw();
      expect(element.documents).to.be.an('array').with.lengthOf(1);
      expect(element.documents[0].uid).to.equal('1');
    });

    test('should not throw and should initialize the list when documents is undefined', () => {
      element.documents = undefined;
      expect(() => element.add(doc('1'))).to.not.throw();
      expect(element.documents).to.be.an('array').with.lengthOf(1);
    });
  });

  suite('contains', () => {
    test('should return true when the document is stored', () => {
      element.documents = [doc('1')];
      expect(element.contains(doc('1'))).to.be.true;
    });

    test('should return false when the document is not stored', () => {
      element.documents = [doc('1')];
      expect(element.contains(doc('2'))).to.be.false;
    });

    test('should return a falsy value and not throw when documents is null', () => {
      element.documents = null;
      expect(() => element.contains(doc('1'))).to.not.throw();
      expect(element.contains(doc('1'))).to.not.be.ok;
    });
  });

  suite('_indexOf', () => {
    test('should return the index of a stored document', () => {
      element.documents = [doc('1'), doc('2')];
      expect(element._indexOf(doc('2'))).to.equal(1);
    });

    test('should return -1 when the document is not stored', () => {
      element.documents = [doc('1')];
      expect(element._indexOf(doc('2'))).to.equal(-1);
    });

    test('should return -1 and not throw when documents is null', () => {
      element.documents = null;
      expect(() => element._indexOf(doc('1'))).to.not.throw();
      expect(element._indexOf(doc('1'))).to.equal(-1);
    });
  });

  suite('remove', () => {
    test('should remove a stored document', () => {
      element.documents = [doc('1'), doc('2')];
      element.remove(doc('1'));
      expect(element.documents.map((d) => d.uid)).to.deep.equal(['2']);
    });

    test('should not throw when documents is null', () => {
      element.documents = null;
      expect(() => element.remove(doc('1'))).to.not.throw();
    });
  });

  suite('update', () => {
    test('should update properties of a stored document', () => {
      element.documents = [doc('1')];
      element.update(doc('1'), { title: 'Renamed' });
      expect(element.documents[0].title).to.equal('Renamed');
    });

    test('should not throw when documents is null', () => {
      element.documents = null;
      expect(() => element.update(doc('1'), { title: 'Renamed' })).to.not.throw();
    });
  });

  suite('get', () => {
    test('should return a stored document', () => {
      element.documents = [doc('1')];
      expect(element.get(doc('1')).uid).to.equal('1');
    });

    test('should return null when the document is not stored', () => {
      element.documents = [doc('1')];
      expect(element.get(doc('2'))).to.be.null;
    });

    test('should return null and not throw when documents is null', () => {
      element.documents = null;
      expect(() => element.get(doc('1'))).to.not.throw();
      expect(element.get(doc('1'))).to.be.null;
    });
  });

  suite('initialize', () => {
    test('should reset documents to an empty array', () => {
      element.documents = null;
      element.initialize();
      expect(element.documents).to.be.an('array').that.is.empty;
    });
  });

  suite('_normalizeLoadedValue', () => {
    test('should initialize documents when the loaded value is null', () => {
      element.documents = null;
      element._normalizeLoadedValue();
      expect(element.documents).to.be.an('array').that.is.empty;
    });

    test('should initialize documents when the loaded value is not an array', () => {
      element.documents = 'corrupted';
      element._normalizeLoadedValue();
      expect(element.documents).to.be.an('array').that.is.empty;
    });

    test('should keep the loaded value when it is already an array', () => {
      element.documents = [doc('1')];
      element._normalizeLoadedValue();
      expect(element.documents.map((d) => d.uid)).to.deep.equal(['1']);
    });
  });
});
