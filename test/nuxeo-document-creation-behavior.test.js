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
import { DocumentCreationBehavior } from '../elements/nuxeo-document-creation/nuxeo-document-creation-behavior.js';

// The actual behavior mixin is the last element in the array
const behavior = DocumentCreationBehavior[DocumentCreationBehavior.length - 1];

suite('DocumentCreationBehavior', () => {
  let ctx;

  setup(() => {
    ctx = Object.create(behavior);
    ctx.set = sinon.stub();
    ctx.fire = sinon.stub();
    ctx.i18n = sinon.stub().callsFake((key) => key);
    ctx.formatDocType = sinon.stub().callsFake((id) => id);
    ctx.targetPath = '/default-domain/workspaces';
    ctx.isValidTargetPath = true;
    ctx.subtypes = [{ _id: '1', type: 'File', id: 'file', icon: 'file-icon', facets: [] }];
    ctx.parent = {
      path: '/default-domain/workspaces',
      contextParameters: { permissions: ['AddChildren'], subtypes: [] },
      isTrashed: false,
    };
  });

  suite('_canCreateIn', () => {
    test('should return true when document has AddChildren permission', () => {
      const doc = { contextParameters: { permissions: ['AddChildren', 'Read'] } };
      expect(ctx._canCreateIn(doc)).to.be.true;
    });

    test('should return false when document lacks AddChildren permission', () => {
      const doc = { contextParameters: { permissions: ['Read'] } };
      expect(ctx._canCreateIn(doc)).to.be.false;
    });

    test('should return false for null document', () => {
      expect(ctx._canCreateIn(null)).to.be.false;
    });

    test('should return false when contextParameters is missing', () => {
      expect(ctx._canCreateIn({})).to.be.false;
    });

    test('should return false when permissions array is missing', () => {
      expect(ctx._canCreateIn({ contextParameters: {} })).to.be.false;
    });
  });

  suite('_sanitizeName', () => {
    test('should replace forward slashes with dashes', () => {
      expect(ctx._sanitizeName('path/to/file')).to.equal('path-to-file');
    });

    test('should replace backslashes with dashes', () => {
      expect(ctx._sanitizeName('path\\to\\file')).to.equal('path-to-file');
    });

    test('should replace multiple slashes', () => {
      expect(ctx._sanitizeName('a/b\\c/d')).to.equal('a-b-c-d');
    });

    test('should leave names without slashes unchanged', () => {
      expect(ctx._sanitizeName('my-document')).to.equal('my-document');
    });
  });

  suite('_isValidType', () => {
    test('should return true when type matches a subtype', () => {
      const type = { _id: '1', type: 'File', icon: 'file-icon' };
      expect(ctx._isValidType(type)).to.be.true;
    });

    test('should return false when type does not match any subtype', () => {
      const type = { _id: '99', type: 'Note', icon: 'note-icon' };
      expect(ctx._isValidType(type)).to.be.false;
    });

    test('should return false when type is null', () => {
      expect(ctx._isValidType(null)).to.not.be.ok;
    });

    test('should return false when subtypes is empty', () => {
      ctx.subtypes = [];
      const type = { _id: '1', type: 'File', icon: 'file-icon' };
      expect(ctx._isValidType(type)).to.not.be.ok;
    });

    test('should return false when subtypes is null', () => {
      ctx.subtypes = null;
      const type = { _id: '1', type: 'File', icon: 'file-icon' };
      expect(ctx._isValidType(type)).to.not.be.ok;
    });
  });

  suite('_parentChanged', () => {
    function parentWith(permissions, subtypes) {
      return {
        path: '/default-domain/workspaces',
        contextParameters: { permissions, subtypes },
        isTrashed: false,
      };
    }

    function subtypesSetTo() {
      return ctx.set.getCalls().find((call) => call.args[0] === 'subtypes');
    }

    test('should drop subtypes flagged HiddenInCreation and keep the rest sorted by id', () => {
      ctx.parent = parentWith(
        ['AddChildren'],
        [
          { type: 'Picture', facets: ['Commentable'] },
          { type: 'Note', facets: ['HiddenInCreation'] },
          { type: 'File', facets: [] },
        ],
      );

      ctx._parentChanged();

      expect(subtypesSetTo().args[1].map((type) => type.type)).to.deep.equal(['File', 'Picture']);
    });

    test('should keep every subtype when none is hidden in creation', () => {
      ctx.parent = parentWith(
        ['AddChildren'],
        [
          { type: 'File', facets: [] },
          { type: 'Picture', facets: ['Commentable'] },
        ],
      );

      ctx._parentChanged();

      expect(subtypesSetTo().args[1].map((type) => type.type)).to.deep.equal(['File', 'Picture']);
    });

    test('should set no subtypes when the parent cannot be created in', () => {
      ctx.parent = parentWith(['Read'], [{ type: 'File', facets: [] }]);

      ctx._parentChanged();

      expect(subtypesSetTo().args[1]).to.deep.equal([]);
    });
  });

  suite('_getTypeLabel', () => {
    test('should return formatted doc type when type is valid', () => {
      const type = { _id: '1', type: 'File', id: 'file', icon: 'file-icon' };
      expect(ctx._getTypeLabel(type)).to.equal('file');
    });

    test('should return empty string when type is invalid', () => {
      const type = { _id: '99', type: 'Unknown', icon: 'unknown-icon' };
      expect(ctx._getTypeLabel(type)).to.equal('');
    });
  });

  suite('_getTypeIcon', () => {
    test('should return icon path when type is valid', () => {
      const type = { _id: '1', type: 'File', id: 'file', icon: 'file-icon' };
      expect(ctx._getTypeIcon(type)).to.equal('images/doctypes/file.svg');
    });

    test('should return empty string when type is invalid', () => {
      const type = { _id: '99', type: 'Unknown', icon: 'unknown-icon' };
      expect(ctx._getTypeIcon(type)).to.equal('');
    });
  });

  suite('_formatErrorMessage', () => {
    test('should return "error" when errorMessage is set', () => {
      ctx.errorMessage = 'Something went wrong';
      expect(ctx._formatErrorMessage()).to.equal('error');
    });

    test('should return empty string when errorMessage is empty', () => {
      ctx.errorMessage = '';
      expect(ctx._formatErrorMessage()).to.equal('');
    });
  });

  suite('_notify', () => {
    test('should fire document-created event', () => {
      ctx._notify({ uid: '123' });
      expect(ctx.fire).to.have.been.calledWith('document-created', { response: { uid: '123' } });
    });

    test('should fire nx-document-creation-finished by default', () => {
      ctx._notify({ uid: '123' });
      expect(ctx.fire).to.have.been.calledWith('nx-document-creation-finished');
    });

    test('should not fire nx-document-creation-finished when close is false', () => {
      ctx._notify({ uid: '123' }, false);
      expect(ctx.fire).to.not.have.been.calledWith('nx-document-creation-finished');
    });
  });

  suite('_validateLocation', () => {
    test('should set canCreate to true when all conditions are met', () => {
      ctx._validateLocation();
      expect(ctx.set).to.have.been.calledWith('canCreate', true);
    });

    test('should set canCreate to false when isValidTargetPath is false', () => {
      ctx.isValidTargetPath = false;
      ctx._validateLocation();
      expect(ctx.set).to.have.been.calledWith('canCreate', false);
      expect(ctx.set).to.have.been.calledWith('errorMessage', 'documentCreationBehavior.error.invalidLocation');
    });

    test('should set canCreate to false when parent has no AddChildren permission', () => {
      ctx.parent.contextParameters.permissions = ['Read'];
      ctx._validateLocation();
      expect(ctx.set).to.have.been.calledWith('canCreate', false);
      expect(ctx.set).to.have.been.calledWith('errorMessage', 'documentCreationBehavior.error.noPermission');
    });

    test('should set canCreate to false when subtypes is empty', () => {
      ctx.subtypes = [];
      ctx._validateLocation();
      expect(ctx.set).to.have.been.calledWith('canCreate', false);
      expect(ctx.set).to.have.been.calledWith('errorMessage', 'documentCreationBehavior.error.noSubtypes');
    });

    test('should set canCreate to false when parent is trashed', () => {
      ctx.parent.isTrashed = true;
      ctx._validateLocation();
      expect(ctx.set).to.have.been.calledWith('canCreate', false);
      expect(ctx.set).to.have.been.calledWith('errorMessage', 'documentCreationBehavior.error.trashedParent');
    });

    test('should fire nx-document-creation-parent-validated event', () => {
      ctx._validateLocation();
      expect(ctx.fire).to.have.been.calledWith('nx-document-creation-parent-validated');
    });
  });

  suite('_getDocumentProperties', () => {
    test('should return null by default (extension point)', () => {
      expect(ctx._getDocumentProperties()).to.be.null;
    });
  });
});
