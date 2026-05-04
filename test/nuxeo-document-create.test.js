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
});
