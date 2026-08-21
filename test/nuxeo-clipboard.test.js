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
import '../elements/nuxeo-clipboard/nuxeo-clipboard.js';

suite('nuxeo-clipboard', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-clipboard></nuxeo-clipboard>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('add', () => {
    test('should add a single document to clipboard via storage', () => {
      const doc = { uid: '1', title: 'Doc 1' };
      const addSpy = sinon.spy(element.$.storage, 'add');
      element.add(doc);
      expect(addSpy).to.have.been.calledWith(doc);
    });

    test('should add multiple documents from an array', () => {
      const docs = [
        { uid: '1', title: 'Doc 1' },
        { uid: '2', title: 'Doc 2' },
      ];
      const addSpy = sinon.spy(element.$.storage, 'add');
      element.add(docs);
      expect(addSpy).to.have.been.calledTwice;
    });

    test('should fire added-to-clipboard event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const doc = { uid: '1', title: 'Doc 1' };
      element.add(doc);
      expect(fireSpy).to.have.been.calledWith('added-to-clipboard', { docIds: ['1'] });
    });
  });

  suite('contains', () => {
    test('should delegate to storage.contains', () => {
      const doc = { uid: '1', title: 'Doc 1' };
      const containsSpy = sinon.spy(element.$.storage, 'contains');
      element.contains(doc);
      expect(containsSpy).to.have.been.calledWith(doc);
    });
  });

  suite('remove', () => {
    test('should delegate to storage.remove', () => {
      const doc = { uid: '1', title: 'Doc 1' };
      const removeSpy = sinon.spy(element.$.storage, 'remove');
      element.remove(doc);
      expect(removeSpy).to.have.been.calledWith(doc);
    });
  });

  suite('canPaste', () => {
    // a section only ever accepts Section children, so a published File never matches its subtypes
    const section = { uid: 's', type: 'Section', contextParameters: { subtypes: [{ type: 'Section' }] } };
    const workspace = {
      uid: 'w',
      type: 'Workspace',
      contextParameters: { subtypes: [{ type: 'File' }, { type: 'Folder' }] },
    };
    const proxy = { uid: 'p', type: 'File', isProxy: true };
    const file = { uid: 'f', type: 'File' };

    const folderish = (target, publishSpace) => {
      element.hasFacet.withArgs(target, 'Folderish').returns(true);
      element.hasFacet.withArgs(target, 'PublishSpace').returns(!!publishSpace);
      return target;
    };

    test('should return false when documents is empty', () => {
      expect(element.canPaste([], { uid: '1' })).to.be.false;
    });

    test('should return false when target is null', () => {
      expect(element.canPaste([{ uid: '1' }], null)).to.be.false;
    });

    test('should return false when target is not Folderish', () => {
      element.hasFacet.returns(false);
      expect(element.canPaste([{ uid: '1' }], { uid: '2' })).to.be.false;
    });

    test('should allow a proxy in a publication space despite the accepted subtypes', () => {
      expect(element.canPaste([proxy], folderish(section, true))).to.be.true;
    });

    test('should not allow a proxy outside a publication space', () => {
      expect(element.canPaste([proxy], folderish(workspace, false))).to.be.false;
    });

    test('should allow a regular document whose type is an accepted subtype', () => {
      expect(element.canPaste([file], folderish(workspace, false))).to.be.true;
    });

    test('should not allow a regular document in a publication space', () => {
      expect(element.canPaste([file], folderish(section, true))).to.be.false;
    });

    test('should not allow a mixed selection of a proxy and a regular document in a publication space', () => {
      expect(element.canPaste([proxy, file], folderish(section, true))).to.be.false;
    });

    test('should allow any regular document when the target does not expose subtypes', () => {
      expect(element.canPaste([file], folderish({ uid: 'n', type: 'Folder' }, false))).to.be.true;
    });

    test('should not allow a proxy when the target exposes no subtypes and is not a publication space', () => {
      expect(element.canPaste([proxy], folderish({ uid: 'n', type: 'Folder' }, false))).to.be.false;
    });
  });

  suite('_title', () => {
    test('should return document title for non-Root', () => {
      const doc = { title: 'My File', type: 'File' };
      expect(element._title(doc)).to.equal('My File');
    });

    test('should return i18n key for Root type', () => {
      const doc = { title: 'Root', type: 'Root' };
      const result = element._title(doc);
      expect(result).to.be.a('string');
    });

    test('should return undefined for falsy document', () => {
      expect(element._title(null)).to.not.be.ok;
    });
  });

  suite('_computedClass', () => {
    test('should include selected when isSelected is true', () => {
      expect(element._computedClass(true)).to.include('selected');
    });

    test('should not include selected when isSelected is false', () => {
      expect(element._computedClass(false)).to.equal('list-item');
    });
  });

  suite('_uids', () => {
    test('should return comma-separated uids', () => {
      element.documents = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];
      expect(element._uids()).to.equal('a,b,c');
    });

    test('should return empty string for empty clipboard', () => {
      element.documents = [];
      expect(element._uids()).to.equal('');
    });
  });

  suite('_removeKeydown', () => {
    test('should call _remove on Enter keydown', () => {
      const removeStub = sinon.stub(element, '_remove');
      element._removeKeydown({
        type: 'keydown',
        key: 'Enter',
        model: { document: { uid: '1' } },
        stopImmediatePropagation: sinon.spy(),
      });
      expect(removeStub).to.have.been.called;
    });

    test('should call _remove on Space keydown', () => {
      const removeStub = sinon.stub(element, '_remove');
      element._removeKeydown({
        type: 'keydown',
        key: ' ',
        model: { document: { uid: '1' } },
        stopImmediatePropagation: sinon.spy(),
      });
      expect(removeStub).to.have.been.called;
    });

    test('should not call _remove on other keys', () => {
      const removeStub = sinon.stub(element, '_remove');
      element._removeKeydown({ type: 'keydown', key: 'a', model: { document: { uid: '1' } } });
      expect(removeStub).to.not.have.been.called;
    });
  });
});
