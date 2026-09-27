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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import '../elements/document/nuxeo-document-create.js';

suite('nuxeo-document-create', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-document-create></nuxeo-document-create>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    await flush();
  });

  test('_computeDocumentTypeOrder reads configured order', () => {
    const previous = window.Nuxeo;
    window.Nuxeo = { UI: { config: { document_type: { order: 'File,Folder' } } } };

    expect(element._computeDocumentTypeOrder()).to.equal('File,Folder');

    window.Nuxeo = previous;
  });

  test('_computeDocumentTypeOrder returns empty string when config is missing', () => {
    const previous = window.Nuxeo;
    window.Nuxeo = {};
    expect(element._computeDocumentTypeOrder()).to.equal('');
    window.Nuxeo = previous;
  });

  test('_getSortedSubtypes sorts by configured order case-insensitively', () => {
    const subtypes = [
      { id: 'Folder', type: 'Folder' },
      { id: 'File', type: 'File' },
      { id: 'Picture', type: 'Picture' },
    ];

    const sorted = element._getSortedSubtypes(subtypes, 'picture,file');
    expect(sorted.map((s) => s.id)).to.deep.equal(['Picture', 'File', 'Folder']);
  });

  test('_getSortedSubtypes returns empty array for invalid subtypes input', () => {
    expect(element._getSortedSubtypes(null, 'File')).to.deep.equal([]);
  });

  test('_getSortedSubtypes keeps original order when config is empty', () => {
    const subtypes = [{ id: 'Folder' }, { id: 'File' }];
    expect(element._getSortedSubtypes(subtypes, '')).to.equal(subtypes);
  });

  test('_canCreate depends on permission and creating status', () => {
    element.canCreate = true;
    element._setCreating(false);
    expect(element._canCreate()).to.be.true;

    element._setCreating(true);
    expect(element._canCreate()).to.be.false;
  });

  test('_visibleOnStage enables only active stage suggester', () => {
    element.visible = true;
    element.stage = 'choose';
    element._visibleOnStage();
    expect(element.$.pathSuggesterChoose.disabled).to.be.false;
    expect(element.$.pathSuggesterEdit.disabled).to.be.true;

    element.stage = 'edit';
    element._visibleOnStage();
    expect(element.$.pathSuggesterChoose.disabled).to.be.true;
    expect(element.$.pathSuggesterEdit.disabled).to.be.false;
  });

  test('_submitKeyHandler triggers create only for input targets', () => {
    const createSpy = sinon.spy(element, '_create');
    element._submitKeyHandler({
      detail: { keyboardEvent: { target: { tagName: 'DIV' } } },
    });
    expect(createSpy).to.not.have.been.called;

    element._submitKeyHandler({
      detail: { keyboardEvent: { target: { tagName: 'INPUT' } } },
    });
    expect(createSpy).to.have.been.calledOnce;
    createSpy.restore();
  });

  test('_clear resets stage and selected type', () => {
    element.stage = 'edit';
    element.selectedDocType = { id: 'File' };
    element._clear();
    expect(element.stage).to.equal('choose');
    expect(element.selectedDocType).to.deep.equal({});
  });

  test('_newDocumentLabel returns localized heading key', () => {
    sinon.stub(element, '_getTypeLabel').returns('File');
    element.selectedDocType = { id: 'File', type: 'File' };
    const label = element._newDocumentLabel();
    expect(label).to.equal('documentCreationForm.newDoc.heading');
    element._getTypeLabel.restore();
  });

  suite('init', () => {
    test('should clear and set selectedDocType when typeId matches a subtype', () => {
      element.subtypes = [
        { id: 'File', type: 'File' },
        { id: 'Folder', type: 'Folder' },
      ];
      element.stage = 'edit';
      element.init('File');
      expect(element.stage).to.equal('choose');
      expect(element.selectedDocType).to.deep.equal({ id: 'File', type: 'File' });
    });

    test('should clear without setting selectedDocType when typeId does not match', () => {
      element.subtypes = [{ id: 'File', type: 'File' }];
      element.stage = 'edit';
      element.init('Unknown');
      expect(element.stage).to.equal('choose');
      expect(element.selectedDocType).to.deep.equal({});
    });

    test('should just clear when no typeId is provided', () => {
      element.stage = 'edit';
      element.selectedDocType = { id: 'File' };
      element.init();
      expect(element.stage).to.equal('choose');
      expect(element.selectedDocType).to.deep.equal({});
    });
  });

  suite('_back', () => {
    test('should clear and fire show-tabs event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element.stage = 'edit';
      element.selectedDocType = { id: 'File' };
      element._back();
      expect(element.stage).to.equal('choose');
      expect(fireSpy).to.have.been.calledWith('nx-creation-wizard-show-tabs');
      fireSpy.restore();
    });
  });

  suite('_cancel', () => {
    test('should clear, unset document, and fire show-tabs event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element.stage = 'edit';
      element.document = { type: 'File' };
      element._cancel();
      expect(element.stage).to.equal('choose');
      expect(element.document).to.be.undefined;
      expect(fireSpy).to.have.been.calledWith('nx-creation-wizard-show-tabs');
      fireSpy.restore();
    });
  });

  suite('_selectType', () => {
    test('should set selectedDocType and fire hide-tabs event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const type = { id: 'Note', type: 'Note' };
      element._selectType({ model: { type } });
      expect(element.selectedDocType).to.deep.equal(type);
      expect(fireSpy).to.have.been.calledWith('nx-creation-wizard-hide-tabs');
      fireSpy.restore();
    });
  });

  suite('_getSortedSubtypes (edge cases)', () => {
    test('should handle duplicate types in orderConfig', () => {
      const subtypes = [
        { id: 'File', type: 'File' },
        { id: 'Folder', type: 'Folder' },
      ];
      const sorted = element._getSortedSubtypes(subtypes, 'File,File,Folder');
      expect(sorted.map((s) => s.id)).to.deep.equal(['File', 'Folder']);
    });

    test('should ignore unknown types in orderConfig', () => {
      const subtypes = [
        { id: 'File', type: 'File' },
        { id: 'Folder', type: 'Folder' },
      ];
      const sorted = element._getSortedSubtypes(subtypes, 'Unknown,File');
      expect(sorted.map((s) => s.id)).to.deep.equal(['File', 'Folder']);
    });

    test('should handle whitespace-only orderConfig', () => {
      const subtypes = [{ id: 'File' }, { id: 'Folder' }];
      expect(element._getSortedSubtypes(subtypes, '   ')).to.equal(subtypes);
    });

    test('should handle non-string orderConfig by returning original array', () => {
      const subtypes = [{ id: 'File' }, { id: 'Folder' }];
      expect(element._getSortedSubtypes(subtypes, 123)).to.equal(subtypes);
    });

    test('should handle orderConfig with trailing commas', () => {
      const subtypes = [
        { id: 'File', type: 'File' },
        { id: 'Folder', type: 'Folder' },
      ];
      const sorted = element._getSortedSubtypes(subtypes, 'Folder,,File,');
      expect(sorted.map((s) => s.id)).to.deep.equal(['Folder', 'File']);
    });

    test('should place unmentioned subtypes after ordered ones', () => {
      const subtypes = [
        { id: 'File', type: 'File' },
        { id: 'Folder', type: 'Folder' },
        { id: 'Picture', type: 'Picture' },
        { id: 'Note', type: 'Note' },
      ];
      const sorted = element._getSortedSubtypes(subtypes, 'Note');
      expect(sorted[0].id).to.equal('Note');
      expect(sorted).to.have.length(4);
    });
  });

  suite('_visibleOnStage (edge cases)', () => {
    test('should disable both suggesters when not visible', () => {
      element.visible = false;
      element.stage = 'choose';
      element._visibleOnStage();
      expect(element.$.pathSuggesterChoose.disabled).to.be.true;
      expect(element.$.pathSuggesterEdit.disabled).to.be.true;
    });
  });

  suite('_create', () => {
    let innerLayout;

    setup(() => {
      innerLayout = {
        validate: sinon.stub(),
        _getValidatableElements: sinon.stub().returns([]),
        element: { root: document.createElement('div') },
      };
      element.$['document-create'].$.layout = innerLayout;
      sinon.stub(element, '_isValidType').returns(true);
      element.canCreate = true;
    });

    test('should scroll to and focus the invalid field on validation failure', async () => {
      const invalidField = { invalid: true, scrollIntoView: sinon.spy(), focus: sinon.spy() };
      innerLayout.validate.resolves(false);
      innerLayout._getValidatableElements.returns([{ invalid: false }, invalidField]);

      await element._create();

      // the options matter: `nearest` keeps the error summary in view and `preventScroll` stops
      // the focus call from scrolling again, so assert them rather than just the call count.
      // Compare the recorded args instead of using `calledOnceWithExactly`: a mismatch on the
      // spy matcher never reaches the reporter and the runner session times out with no result.
      expect(invalidField.scrollIntoView.args).to.deep.equal([[{ block: 'nearest' }]]);
      expect(invalidField.focus.args).to.deep.equal([[{ preventScroll: true }]]);
      expect(element.creating).to.be.false;
    });

    test('should not throw when no field reports itself invalid', async () => {
      innerLayout.validate.resolves(false);
      innerLayout._getValidatableElements.returns([{ invalid: false }]);

      await element._create();

      expect(element.creating).to.be.false;
    });
  });
});
