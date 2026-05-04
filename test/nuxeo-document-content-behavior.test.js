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
import { DocumentContentBehavior } from '../elements/nuxeo-results/nuxeo-document-content-behavior.js';

// The actual behavior mixin is the last element in the array
const behavior = DocumentContentBehavior[DocumentContentBehavior.length - 1];

suite('DocumentContentBehavior', () => {
  let ctx;

  setup(() => {
    ctx = Object.create(behavior);
    ctx.set = sinon.stub();
    ctx.fire = sinon.stub();
    ctx.i18n = sinon.stub().callsFake((key) => key);
    ctx.hasFacet = sinon.stub().returns(false);
    ctx.hasPermission = sinon.stub().returns(false);
    ctx.isTrashed = sinon.stub().returns(false);
    ctx.toggleClass = sinon.stub();
    ctx.notify = sinon.stub();
    ctx.$$ = sinon.stub();
  });

  suite('_canSort', () => {
    test('should return true when document is not Orderable and options has items', () => {
      const doc = { uid: '1' };
      ctx.hasFacet.returns(false);
      const options = [{ field: 'dc:title' }];
      expect(ctx._canSort(doc, options)).to.be.true;
    });

    test('should return true (fallback) when document is Orderable', () => {
      const doc = { uid: '1' };
      ctx.hasFacet.withArgs(doc, 'Orderable').returns(true);
      const options = [{ field: 'dc:title' }];
      // Ternary fallback: !(true) && options = false → returns true
      expect(ctx._canSort(doc, options)).to.be.true;
    });

    test('should return false when not Orderable and options is empty array', () => {
      const doc = { uid: '1' };
      ctx.hasFacet.returns(false);
      expect(ctx._canSort(doc, [])).to.be.false;
    });

    test('should return true when document is null', () => {
      expect(ctx._canSort(null, [{ field: 'dc:title' }])).to.be.true;
    });
  });

  suite('_displaySort', () => {
    test('should return field when document is not Orderable', () => {
      ctx.hasFacet.returns(false);
      const doc = { uid: '1' };
      expect(ctx._displaySort(doc, 'dc:title')).to.equal('dc:title');
    });

    test('should still return field when document is Orderable (canSort fallback)', () => {
      const doc = { uid: '1' };
      ctx.hasFacet.withArgs(doc, 'Orderable').returns(true);
      // _canSort(document) with no options arg returns true (fallback branch)
      expect(ctx._displaySort(doc, 'dc:title')).to.equal('dc:title');
    });
  });

  suite('_computeParams', () => {
    test('should return params with parent id and trashed status', () => {
      ctx.isTrashed.returns(false);
      const doc = { uid: 'doc-123' };
      const params = ctx._computeParams(doc);
      expect(params).to.deep.equal({ ecm_parentId: 'doc-123', ecm_trashed: false });
    });

    test('should set ecm_trashed to true when document is trashed', () => {
      ctx.isTrashed.returns(true);
      const doc = { uid: 'doc-456' };
      const params = ctx._computeParams(doc);
      expect(params).to.deep.equal({ ecm_parentId: 'doc-456', ecm_trashed: true });
    });
  });

  suite('_computeSort', () => {
    test('should return position sort for Orderable documents', () => {
      const doc = { uid: '1' };
      ctx.hasFacet.withArgs(doc, 'Orderable').returns(true);
      expect(ctx._computeSort(doc)).to.deep.equal({ 'ecm:pos': 'ASC' });
    });

    test('should return empty sort for non-Orderable documents', () => {
      const doc = { uid: '1' };
      ctx.hasFacet.returns(false);
      expect(ctx._computeSort(doc)).to.deep.equal({});
    });
  });

  suite('_hasWritePermission', () => {
    test('should return true when document has Write permission', () => {
      const doc = { uid: '1' };
      ctx.hasPermission.withArgs(doc, 'Write').returns(true);
      expect(ctx._hasWritePermission(doc)).to.be.true;
    });

    test('should return false when document lacks Write permission', () => {
      const doc = { uid: '1' };
      ctx.hasPermission.returns(false);
      expect(ctx._hasWritePermission(doc)).to.be.false;
    });

    test('should return falsy for null document', () => {
      expect(ctx._hasWritePermission(null)).to.not.be.ok;
    });
  });

  suite('_navigate', () => {
    test('should fire navigate event with item from model', () => {
      const item = { uid: 'doc-1' };
      const e = { model: { item }, stopPropagation: sinon.spy() };
      ctx._navigate(e);
      expect(ctx.fire).to.have.been.calledWith('navigate', { doc: item });
      expect(e.stopPropagation).to.have.been.called;
    });

    test('should fire navigate event with item from detail', () => {
      const item = { uid: 'doc-2' };
      const e = { detail: { item }, stopPropagation: sinon.spy() };
      ctx._navigate(e);
      expect(ctx.fire).to.have.been.calledWith('navigate', { doc: item });
    });
  });

  suite('_handleDocumentCreated', () => {
    test('should fire document-updated event', () => {
      ctx._handleDocumentCreated();
      expect(ctx.fire).to.have.been.calledWith('document-updated');
    });
  });

  suite('_isFileDrag', () => {
    test('should return true when dataTransfer contains Files', () => {
      const e = { dataTransfer: { types: ['Files'] } };
      expect(ctx._isFileDrag(e)).to.be.true;
    });

    test('should return false when dataTransfer has no Files', () => {
      const e = { dataTransfer: { types: ['text/plain'] } };
      expect(ctx._isFileDrag(e)).to.be.false;
    });

    test('should return false when dataTransfer is missing', () => {
      const e = {};
      expect(ctx._isFileDrag(e)).to.not.be.ok;
    });
  });

  suite('_computeSortOptions', () => {
    test('should return 7 sort options', () => {
      const options = ctx._computeSortOptions();
      expect(options).to.have.length(7);
    });

    test('should have dc:title as first option with selected true', () => {
      const options = ctx._computeSortOptions();
      expect(options[0].field).to.equal('dc:title');
      expect(options[0].selected).to.be.true;
    });
  });

  suite('_computeVisible', () => {
    test('should set visible based on element dimensions', () => {
      ctx.offsetWidth = 100;
      ctx.offsetHeight = 200;
      ctx.visible = false;
      ctx._computeVisible();
      expect(ctx.visible).to.be.true;
    });

    test('should set visible to false when element is hidden', () => {
      ctx.offsetWidth = 0;
      ctx.offsetHeight = 0;
      ctx._computeVisible();
      expect(ctx.visible).to.be.false;
    });
  });

  suite('_dropTargetFilter', () => {
    test('should return true for Folderish items', () => {
      ctx.hasFacet.withArgs({ uid: '1' }, 'Folderish').returns(true);
      expect(ctx._dropTargetFilter(null, { item: { uid: '1' } })).to.be.true;
    });

    test('should return true for Collection items', () => {
      ctx.hasFacet.withArgs({ uid: '2' }, 'Collection').returns(true);
      expect(ctx._dropTargetFilter(null, { item: { uid: '2' } })).to.be.true;
    });

    test('should return false for non-Folderish non-Collection items', () => {
      expect(ctx._dropTargetFilter(null, { item: { uid: '3' } })).to.be.false;
    });

    test('should return falsy when model is null', () => {
      expect(ctx._dropTargetFilter(null, null)).to.not.be.ok;
    });
  });
});
