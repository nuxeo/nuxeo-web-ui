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
      expect(deepQuery('#htmlPreview')).to.not.be.null;
      expect(deepQuery('nuxeo-html-editor')).to.be.null;
    });

    test('the preview keeps every structure Quill used to discard', async () => {
      const note =
        '<table><caption>c</caption><colgroup><col /></colgroup>' +
        '<thead><tr><th rowspan="2">R</th><th colspan="2">H</th></tr></thead>' +
        '<tbody><tr><td>a</td><td><table><tr><td>nested</td></tr></table></td></tr></tbody>' +
        '<tfoot><tr><td colspan="3">f</td></tr></tfoot></table>';
      el.document = htmlDoc(note);
      await flush();
      const rendered = new DOMParser().parseFromString(deepQuery('#htmlPreview').getAttribute('srcdoc'), 'text/html');
      const table = rendered.querySelector('table');
      expect(table, 'the note table should be rendered').to.not.be.null;
      expect(table.querySelectorAll('th')).to.have.lengthOf(2);
      expect(table.querySelectorAll('thead')).to.have.lengthOf(1);
      expect(table.querySelectorAll('tfoot')).to.have.lengthOf(1);
      expect(table.querySelectorAll('caption')).to.have.lengthOf(1);
      expect(table.querySelectorAll('colgroup')).to.have.lengthOf(1);
      expect(table.querySelectorAll('[colspan]')).to.have.lengthOf(2);
      expect(table.querySelectorAll('[rowspan]')).to.have.lengthOf(1);
      expect(table.querySelectorAll('table'), 'nested table').to.have.lengthOf(1);
    });

    test('the preview frame is sized to the note it renders', async () => {
      el.document = htmlDoc('<p style="height: 400px">tall</p>');
      await flush();
      const frame = deepQuery('#htmlPreview');
      await new Promise((resolve) => {
        const ready = () => frame.contentDocument && frame.contentDocument.body;
        if (ready()) {
          resolve();
        } else {
          frame.addEventListener('load', resolve, { once: true });
        }
      });
      // read the content height before resizing: growing the frame grows body.scrollHeight with it
      const contentHeight = frame.contentDocument.body.scrollHeight;
      expect(contentHeight).to.be.greaterThan(0);
      el._resizeHtmlPreview({ target: frame });
      expect(frame.style.height).to.equal(`${contentHeight + 32}px`);
    });

    test('sizing is skipped until the frame has a document to measure', () => {
      const pending = { contentDocument: null, style: {} };
      el._resizeHtmlPreview({ target: pending });
      expect(pending.style.height).to.be.undefined;

      const empty = { contentDocument: { body: null }, style: {} };
      el._resizeHtmlPreview({ target: empty });
      expect(empty.style.height).to.be.undefined;
    });

    test('a missing or empty note renders an empty preview', () => {
      expect(el._computeHtmlPreview(undefined)).to.contain('<body></body>');
      expect(el._computeHtmlPreview({})).to.contain('<body></body>');
      expect(el._computeHtmlPreview({ properties: {} })).to.contain('<body></body>');
      expect(el._computeHtmlPreview({ properties: { 'note:note': '' } })).to.contain('<body></body>');
    });

    test('the preview cannot execute scripts carried by the note', async () => {
      el.document = htmlDoc('<img src="x" onerror="window.__noteXss = true">');
      await flush();
      const frame = deepQuery('#htmlPreview');
      const sandbox = frame.getAttribute('sandbox');
      expect(sandbox).to.not.be.null;
      expect(sandbox.split(/\s+/)).to.not.include('allow-scripts');
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

    test('switching to another note leaves the editor and returns to view mode', () => {
      el.document = htmlDoc();
      el._editHtml();
      expect(el._editing).to.be.true;
      el.document = { ...htmlDoc('<p>the other note</p>'), uid: 'note-2' };
      expect(el._editing).to.be.false;
      expect(el._viewMode).to.be.true;
      expect(el._value).to.equal('<p>the other note</p>');
    });

    test('refreshing the same note does not discard an edit in progress', () => {
      el.document = htmlDoc();
      el._editHtml();
      el._toggleHtmlSource();
      el._value = '<p>unsaved draft</p>';
      el.document = { ...htmlDoc(), properties: { ...htmlDoc().properties, 'dc:title': 'renamed' } };
      expect(el._editing).to.be.true;
      expect(el._viewMode).to.be.false;
      expect(el._value, 'the draft must survive a refresh of the same note').to.equal('<p>unsaved draft</p>');
    });

    test('refreshing the same note while not editing picks up the stored content', () => {
      el.document = htmlDoc('<p>one</p>');
      expect(el._value).to.equal('<p>one</p>');
      el.document = htmlDoc('<p>two</p>');
      expect(el._value).to.equal('<p>two</p>');
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
