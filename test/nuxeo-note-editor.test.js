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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-note-editor/nuxeo-note-editor.js';

suite('nuxeo-note-editor', () => {
  let el;

  const noteDoc = (overrides = {}) => {
    return {
      uid: 'note-1',
      type: 'Note',
      schemas: [{ name: 'note' }, { name: 'dublincore' }],
      properties: {
        'note:note': '<p>hello</p>',
        'note:mime_type': 'text/plain',
        ...overrides.properties,
      },
      ...overrides,
    };
  };

  const htmlDoc = (note = '<table><thead><tr><th>h</th></tr></thead><tbody><tr><td>c</td></tr></tbody></table>') =>
    noteDoc({ properties: { 'note:mime_type': 'text/html', 'note:note': note } });

  setup(async () => {
    el = await fixture(html`<nuxeo-note-editor></nuxeo-note-editor>`);
    sinon.stub(el, 'i18n').callsFake((key) => key);
    sinon.stub(el, 'hasPermission').returns(true);
    sinon.stub(el, 'hasFacet').returns(false);
    sinon.stub(el, 'isTrashed').returns(false);
    await flush();
  });

  test('_isHTML is true when mime type is text/html', () => {
    el.document = noteDoc({ properties: { 'note:mime_type': 'text/html', 'note:note': '<p>x</p>' } });
    expect(el._isHTML()).to.be.true;
  });

  test('_isHTML is false for plain text note', () => {
    el.document = noteDoc();
    expect(el._isHTML()).to.be.false;
  });

  test('_computeHtmlEditIcon toggles with view mode', () => {
    el._viewMode = true;
    expect(el._computeHtmlEditIcon()).to.equal('icons:code');
    el._viewMode = false;
    expect(el._computeHtmlEditIcon()).to.equal('nuxeo:edit');
  });

  test('_computeHtmlEditLabel reflects view mode', () => {
    el._viewMode = true;
    expect(el._computeHtmlEditLabel()).to.equal('noteEditor.editSource');
    el._viewMode = false;
    expect(el._computeHtmlEditLabel()).to.equal('noteEditor.editRich');
  });

  test('_documentChanged copies note body into _value', () => {
    el.document = noteDoc({ properties: { 'note:note': 'body text' } });
    el._documentChanged();
    expect(el._value).to.equal('body text');
  });

  test('_isMutable is false for Root, trashed, or Immutable facet', () => {
    expect(el._isMutable({ type: 'Root' })).to.be.false;
    el.hasFacet.returns(true);
    expect(el._isMutable({ type: 'Note' })).to.be.false;
    el.hasFacet.returns(false);
    el.isTrashed.returns(true);
    expect(el._isMutable({ type: 'Note' })).to.be.false;
  });

  test('_canEdit requires WriteProperties and mutable document', () => {
    el.hasPermission.returns(false);
    expect(el._canEdit({ type: 'Note', facets: [] })).to.be.false;
    el.hasPermission.returns(true);
    expect(el._canEdit({ type: 'Note', facets: [] })).to.be.true;
  });

  test('_edit switches to edit mode with current note value', () => {
    el.document = noteDoc({ properties: { 'note:note': 'edited' } });
    el._edit();
    expect(el._viewMode).to.be.false;
    expect(el._value).to.equal('edited');
  });

  test('_cancel resets value and returns to view mode', () => {
    el._viewMode = false;
    el._editing = true;
    el._value = 'draft';
    el._cancel();
    expect(el._viewMode).to.be.true;
    expect(el._editing).to.be.false;
    expect(el._value).to.equal('');
  });

  test('_toggleHtmlSource flips view mode', () => {
    el._viewMode = true;
    el._toggleHtmlSource();
    expect(el._viewMode).to.be.false;
    el._toggleHtmlSource();
    expect(el._viewMode).to.be.true;
  });

  test('_editorSave persists note and resets view mode', async () => {
    el.document = noteDoc({ properties: { 'note:note': 'old' } });
    el._value = 'new content';
    sinon.stub(el.$.note, 'put').resolves();
    sinon.stub(el, 'notify');
    sinon.stub(el, 'fire');

    el._editorSave();
    await flush();

    expect(el.$.note.put).to.have.been.calledOnce;
    expect(el.$.note.data.properties['note:note']).to.equal('new content');
    expect(el.notify).to.have.been.called;
    expect(el.fire).to.have.been.calledWith('document-updated');
    expect(el._viewMode).to.be.true;
    expect(el._editing).to.be.false;

    el.$.note.put.restore();
    el.notify.restore();
    el.fire.restore();
  });

  suite('HTML notes are displayed as stored (ELEMENTS-1806)', () => {
    // Quill cannot represent thead/tfoot/th/colgroup/colspan/rowspan or nested tables, so an
    // HTML note must not be routed through the rich text editor just to be read.
    const deepQuery = (selector) => {
      const walk = (root) => {
        const hit = root.querySelector(selector);
        if (hit) {
          return hit;
        }
        for (const child of root.querySelectorAll('*')) {
          if (child.shadowRoot) {
            const nested = walk(child.shadowRoot);
            if (nested) {
              return nested;
            }
          }
        }
        return null;
      };
      return walk(el.shadowRoot);
    };

    test('an HTML note starts in view mode, not in the editor', () => {
      el.document = htmlDoc();
      expect(el._editing).to.be.false;
    });

    test('view mode renders the preview and not the rich text editor', async () => {
      el.document = htmlDoc();
      await flush();
      expect(deepQuery('nuxeo-document-preview')).to.not.be.null;
      expect(deepQuery('nuxeo-html-editor')).to.be.null;
    });

    test('view mode offers an edit action when the user can edit', async () => {
      el.document = htmlDoc();
      await flush();
      const button = deepQuery('#editHtmlNote');
      expect(button).to.not.be.null;
      expect(button.hidden).to.be.false;
    });

    test('view mode hides the edit action when the user cannot edit', async () => {
      el.hasPermission.returns(false);
      el.document = htmlDoc();
      await flush();
      expect(deepQuery('#editHtmlNote').hidden).to.be.true;
      expect(deepQuery('nuxeo-html-editor')).to.be.null;
    });

    test('_editHtml opens the rich text editor with the stored content', () => {
      const note = '<table><tfoot><tr><td colspan="2">t</td></tr></tfoot></table>';
      el.document = htmlDoc(note);
      el._editHtml();
      expect(el._editing).to.be.true;
      expect(el._viewMode).to.be.true;
      expect(el._value).to.equal(note);
    });

    test('the rich text editor is only mounted once editing starts', async () => {
      el.document = htmlDoc();
      await flush();
      expect(deepQuery('nuxeo-html-editor')).to.be.null;
      el._editHtml();
      await flush();
      expect(deepQuery('nuxeo-html-editor')).to.not.be.null;
    });

    test('the HTML source view still shows the stored markup', async () => {
      const note = '<table><thead><tr><th>kept</th></tr></thead></table>';
      el.document = htmlDoc(note);
      el._editHtml();
      el._toggleHtmlSource();
      await flush();
      expect(el._viewMode).to.be.false;
      expect(el._value).to.equal(note);
    });
  });
});
