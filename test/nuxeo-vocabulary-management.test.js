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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import '../elements/directory/nuxeo-vocabulary-management.js';

suite('nuxeo-vocabulary-management', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-vocabulary-management></nuxeo-vocabulary-management>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    // Provide vocabularies to prevent _schemaFor from crashing
    element.vocabularies = [
      { name: 'coverage', schema: 'coverage', parent: '', readOnly: false },
      { name: 'continent', schema: 'xvocabulary', parent: 'coverage', readOnly: false },
      { name: 'country', schema: 'xvocabulary', parent: 'continent', readOnly: true },
      { name: 'nature', schema: '', parent: '' },
    ];
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default entries to empty array', () => {
      expect(element.entries).to.deep.equal([]);
    });
  });

  suite('_isVocabularySelected', () => {
    test('should return falsy when selectedVocabulary is empty', () => {
      element.selectedVocabulary = '';
      expect(element._isVocabularySelected()).to.not.be.ok;
    });

    test('should return truthy when selectedVocabulary is set', () => {
      element.selectedVocabulary = 'coverage';
      expect(element._isVocabularySelected()).to.be.ok;
    });

    test('should return falsy when selectedVocabulary is null', () => {
      element.selectedVocabulary = null;
      expect(element._isVocabularySelected()).to.not.be.ok;
    });
  });

  suite('_schemaFor', () => {
    test('should return undefined when no vocabulary selected', () => {
      element.selectedVocabulary = '';
      expect(element._schemaFor()).to.be.undefined;
    });

    test('should return schema from vocabularies', () => {
      element.selectedVocabulary = 'coverage';
      expect(element._schemaFor()).to.equal('coverage');
    });

    test('should return "vocabulary" when schema is empty', () => {
      element.selectedVocabulary = 'nature';
      expect(element._schemaFor()).to.equal('vocabulary');
    });

    test('should return xvocabulary schema for continent', () => {
      element.selectedVocabulary = 'continent';
      expect(element._schemaFor()).to.equal('xvocabulary');
    });
  });

  suite('_computeReadOnly', () => {
    test('should return false when no vocabulary is selected', () => {
      expect(element._computeReadOnly('', element.vocabularies)).to.be.false;
      expect(element._computeReadOnly(null, element.vocabularies)).to.be.false;
    });

    test('should return false when vocabularies is not an array', () => {
      expect(element._computeReadOnly('country', null)).to.be.false;
      expect(element._computeReadOnly('country', undefined)).to.be.false;
    });

    test('should return false for a writable vocabulary', () => {
      expect(element._computeReadOnly('coverage', element.vocabularies)).to.be.false;
    });

    test('should return true for a readOnly vocabulary', () => {
      expect(element._computeReadOnly('country', element.vocabularies)).to.be.true;
    });

    test('should return false when the vocabulary has no readOnly field (legacy server)', () => {
      expect(element._computeReadOnly('nature', element.vocabularies)).to.be.false;
    });

    test('should expose _isReadOnly as a computed property reflecting the selection', async () => {
      element.selectedVocabulary = 'country';
      await flush();
      expect(element._isReadOnly).to.be.true;
      element.selectedVocabulary = 'coverage';
      await flush();
      expect(element._isReadOnly).to.be.false;
    });
  });

  suite('read-only guards', () => {
    setup(async () => {
      element.selectedVocabulary = 'country';
      await flush();
    });

    test('_createEntry should be a no-op for readOnly vocabularies', () => {
      const dialog = { toggle: sinon.spy() };
      element.$.vocabularyEditDialog = dialog;
      element._createEntry();
      expect(dialog.toggle).to.not.have.been.called;
      expect(element._selectedEntry).to.be.undefined;
    });

    test('_save should be a no-op for readOnly vocabularies', () => {
      const layout = { validate: sinon.spy() };
      element.$.layout = layout;
      element._save();
      expect(layout.validate).to.not.have.been.called;
    });

    test('_deleteEntry should be a no-op for readOnly vocabularies', () => {
      const confirmStub = sinon.stub(window, 'confirm').returns(true);
      try {
        element._deleteEntry({
          target: { parentNode: { item: { directoryName: 'country', properties: { id: 'x' } } } },
        });
        expect(confirmStub).to.not.have.been.called;
      } finally {
        confirmStub.restore();
      }
    });

    test('addEntry button should be disabled (not hidden) for readOnly vocabulary', async () => {
      await flush();
      const btn = element.shadowRoot.querySelector('#addEntry');
      expect(btn, 'addEntry button should be rendered').to.exist;
      expect(btn.disabled).to.be.true;
      expect(btn.hasAttribute('hidden')).to.be.false;
    });

    test('addEntry button should not be disabled for writable vocabulary', async () => {
      element.selectedVocabulary = 'coverage';
      await flush();
      const btn = element.shadowRoot.querySelector('#addEntry');
      expect(btn, 'addEntry button should be rendered').to.exist;
      expect(btn.disabled).to.be.false;
      expect(btn.hasAttribute('hidden')).to.be.false;
    });
  });

  suite('_computeDialogHeading', () => {
    test('should return addEntry key for new entry', () => {
      expect(element._computeDialogHeading(true)).to.equal('vocabularyManagement.popup.addEntry');
    });

    test('should return editEntry key for existing entry', () => {
      expect(element._computeDialogHeading(false)).to.equal('vocabularyManagement.popup.editEntry');
    });
  });

  suite('_visibleDataTableStyle', () => {
    test('should return display block when entries exist', () => {
      expect(element._visibleDataTableStyle([{ id: '1' }])).to.equal('display: block;');
    });

    test('should return display none when entries is empty', () => {
      expect(element._visibleDataTableStyle([])).to.equal('display: none;');
    });
  });

  suite('_entryActions', () => {
    test('should return true for actions column', () => {
      expect(element._entryActions('actions')).to.be.true;
    });

    test('should return false for non-actions column', () => {
      expect(element._entryActions('id')).to.be.false;
    });

    test('should return false for label column', () => {
      expect(element._entryActions('label')).to.be.false;
    });
  });

  suite('_computeColPos', () => {
    test('should return 1 for parent', () => {
      expect(element._computeColPos('parent')).to.equal(1);
    });

    test('should return 2 for id', () => {
      expect(element._computeColPos('id')).to.equal(2);
    });

    test('should return 98 for obsolete', () => {
      expect(element._computeColPos('obsolete')).to.equal(98);
    });

    test('should return 99 for ordering', () => {
      expect(element._computeColPos('ordering')).to.equal(99);
    });

    test('should return 50 for other columns', () => {
      expect(element._computeColPos('label')).to.equal(50);
    });

    test('should return 50 for custom columns', () => {
      expect(element._computeColPos('myCustomField')).to.equal(50);
    });
  });

  suite('_encodePathSegment', () => {
    test('should encode a raw path segment', () => {
      expect(element._encodePathSegment('my entry')).to.equal('my%20entry');
    });

    test('should encode @ at start of segment', () => {
      expect(element._encodePathSegment('@test')).to.equal('%40test');
    });

    test('should encode @ in middle of segment', () => {
      expect(element._encodePathSegment('qa@test')).to.equal('qa%40test');
    });

    test('should not double encode an already encoded segment', () => {
      expect(element._encodePathSegment('my%20entry')).to.equal('my%20entry');
    });

    test('should not double encode an already encoded @ segment', () => {
      expect(element._encodePathSegment('qa%40test')).to.equal('qa%40test');
    });

    test('should not double encode an already encoded @ at start', () => {
      expect(element._encodePathSegment('%40test')).to.equal('%40test');
    });

    test('should encode when decodeURIComponent throws', () => {
      expect(element._encodePathSegment('%E0%A4%A')).to.equal('%25E0%25A4%25A');
    });
  });

  suite('_value', () => {
    test('should return entry property value', () => {
      element.entries = [{ properties: { id: 'entry1', label: 'Entry 1' } }];
      expect(element._value(0, 'label')).to.equal('Entry 1');
    });

    test('should return i18n yes key for obsolete property > 0', () => {
      element.entries = [{ properties: { obsolete: 1 } }];
      expect(element._value(0, 'obsolete')).to.equal('label.yes');
    });

    test('should return i18n no key for obsolete property = 0', () => {
      element.entries = [{ properties: { obsolete: 0 } }];
      expect(element._value(0, 'obsolete')).to.equal('label.no');
    });

    test('should return undefined for property not in entry', () => {
      element.entries = [{ properties: { id: 'entry1' } }];
      // The code enters the if block (entry, entry.properties, and prop are all truthy)
      // but returns entry.properties['missing'] which is undefined
      expect(element._value(0, 'missing')).to.be.undefined;
    });

    test('should return N/A when entry is missing', () => {
      element.entries = [];
      expect(element._value(5, 'id')).to.equal('N/A');
    });

    test('should return N/A when prop is empty', () => {
      element.entries = [{ properties: { id: 'entry1' } }];
      expect(element._value(0, '')).to.equal('N/A');
    });
  });

  suite('_layoutHref', () => {
    test('should return layout URL for schema', () => {
      const href = element._layoutHref('coverage');
      expect(href).to.be.a('string');
      expect(href).to.include('coverage');
    });

    test('should lowercase the schema name', () => {
      const href = element._layoutHref('Coverage');
      expect(href).to.include('coverage/nuxeo-coverage-edit-layout.html');
    });
  });

  suite('_getParentDirectoryFor', () => {
    test('should return parent for a directory entry', () => {
      const entry = { directoryName: 'continent' };
      expect(element._getParentDirectoryFor(entry)).to.equal('coverage');
    });

    test('should return empty string when no parent', () => {
      const entry = { directoryName: 'coverage' };
      expect(element._getParentDirectoryFor(entry)).to.equal('');
    });

    test('should return empty string for unknown directory', () => {
      const entry = { directoryName: 'unknown' };
      expect(element._getParentDirectoryFor(entry)).to.equal('');
    });
  });

  suite('_layoutModel', () => {
    test('should return model object with expected properties', () => {
      element._selectedEntry = { directoryName: 'coverage' };
      element.selectedVocabulary = 'coverage';
      element._new = false;
      element.entries = [{ properties: { id: 'test' } }];
      const model = element._layoutModel();
      expect(model).to.have.property('entry').that.deep.equals({ directoryName: 'coverage' });
      expect(model).to.have.property('directory', 'coverage');
      expect(model).to.have.property('parentDirectory');
      expect(model).to.have.property('entries');
      expect(model).to.have.property('new', false);
    });
  });

  suite('_save', () => {
    test('should encode directory path when creating a new entry', async () => {
      element._selectedEntry = {
        directoryName: 'my vocabulary',
        properties: { id: 'entry one' },
      };
      element._new = true;
      sinon.stub(element.$.layout, 'validate').returns(true);
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves({});
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      sinon.stub(element.$.vocabularyEditDialog, 'toggle');

      element._save();
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/my%20vocabulary');
    });

    test('should encode directory and id path segments when updating an entry', async () => {
      element._selectedEntry = {
        directoryName: 'my vocabulary',
        properties: { id: 'entry one' },
      };
      element._new = false;
      sinon.stub(element.$.layout, 'validate').returns(true);
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves({});
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      sinon.stub(element.$.vocabularyEditDialog, 'toggle');

      element._save();
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/my%20vocabulary/entry%20one');
    });

    test('should keep already encoded id unchanged when updating an entry', async () => {
      element._selectedEntry = {
        directoryName: 'my vocabulary',
        properties: { id: 'entry%20one' },
      };
      element._new = false;
      sinon.stub(element.$.layout, 'validate').returns(true);
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves({});
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      sinon.stub(element.$.vocabularyEditDialog, 'toggle');

      element._save();
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/my%20vocabulary/entry%20one');
    });

    test('should encode id starting with @ when updating an entry', async () => {
      element._selectedEntry = {
        directoryName: 'language',
        properties: { id: '@test' },
      };
      element._new = false;
      sinon.stub(element.$.layout, 'validate').returns(true);
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves({});
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      sinon.stub(element.$.vocabularyEditDialog, 'toggle');

      element._save();
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/language/%40test');
    });

    test('should convert ordering to number', () => {
      element._selectedEntry = { properties: { ordering: '5', id: 'test' } };
      element._new = true;
      element.selectedVocabulary = 'coverage';
      sinon.stub(element.$.layout, 'validate').returns(true);
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves({});
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      element.$.vocabularyEditDialog = { toggle: sinon.stub() };
      element._save();
      expect(element._selectedEntry.properties.ordering).to.equal(5);
      executeStub.restore();
    });
  });

  suite('_executeDirectoryRequest', () => {
    test('should execute request with explicit URL without re-encoding path', async () => {
      element.$.directory.path = '/directory/language/%40test';
      const execute = sinon.stub().resolves({});
      const request = { execute };
      element.$.nx.url = '/nuxeo';
      sinon.stub(element.$.nx, 'request').resolves(request);

      await element._executeDirectoryRequest('DELETE');

      expect(execute).to.have.been.calledWithMatch({
        method: 'DELETE',
        url: '/nuxeo/api/v1/directory/language/%40test',
      });
    });

    test('should include body and normalize URL when base has trailing slash and path has no leading slash', async () => {
      element.$.directory.path = 'directory/continent/entry';
      const body = { test: true };
      const execute = sinon.stub().resolves({});
      const request = { execute };
      element.$.nx.url = '/nuxeo/';
      sinon.stub(element.$.nx, 'request').resolves(request);

      await element._executeDirectoryRequest('PUT', body);

      expect(execute).to.have.been.calledWithMatch({
        method: 'PUT',
        url: '/nuxeo/api/v1/directory/continent/entry',
        body,
      });
    });
  });

  suite('_createEntry', () => {
    test('should set _new to true and create empty selectedEntry', async () => {
      element.selectedVocabulary = 'coverage';
      sinon.stub(element, '_getSchemaFields').resolves(['id', 'label', 'obsolete']);
      sinon.stub(element.$.vocabularyEditDialog, 'toggle');
      element._createEntry();
      // Wait for the promise chain to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(element._new).to.be.true;
      expect(element._selectedEntry).to.have.property('properties');
      expect(element._selectedEntry.directoryName).to.equal('coverage');
    });
  });

  suite('_editEntry', () => {
    test('should set _new to false and set selectedEntry', () => {
      const entry = { properties: { id: 'test', label: 'Test' } };
      sinon.stub(element.$.vocabularyEditDialog, 'toggle');
      element._editEntry({ target: { parentNode: { item: entry } } });
      expect(element._new).to.be.false;
      expect(element._selectedEntry).to.deep.equal(entry);
    });
  });

  suite('_visibleChanged', () => {
    test('should fetch vocabularies when visible and vocabularies unset', async () => {
      const fresh = await fixture(html`<nuxeo-vocabulary-management></nuxeo-vocabulary-management>`);
      sinon.stub(fresh, 'i18n').callsFake((key) => key);
      const entries = [{ name: 'z', schema: 's', parent: '' }];
      sinon.stub(fresh.$.directory, 'get').resolves({ entries });
      fresh.visible = true;
      fresh._visibleChanged();
      await fresh.$.directory.get.returnValues[0];
      expect(fresh.vocabularies).to.deep.equal(entries);
    });
  });

  suite('_refresh', () => {
    test('should build colDef and entries from directory response', async () => {
      element.selectedVocabulary = 'coverage';
      const resp = {
        entries: [
          {
            directoryName: 'coverage',
            properties: { id: '1', label: 'A', ordering: '0' },
          },
        ],
      };
      sinon.stub(element.$.directory, 'get').resolves(resp);
      sinon.stub(element, '_isVocabularySelected').returns(true);
      element.$.directory.path = '';
      element._refresh();
      await element.$.directory.get.returnValues[0];
      expect(element.entries).to.deep.equal(resp.entries);
      expect(element.colDef.some((c) => c.key === 'actions')).to.be.true;
      expect(element.colDef.some((c) => c.key === 'id')).to.be.true;
    });
  });

  suite('_deleteEntry', () => {
    test('should remove entry and refresh when confirmed', async () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves();
      const item = {
        directoryName: 'coverage',
        properties: { id: 'entry-1' },
      };
      element._deleteEntry({ target: { parentNode: { item } } });
      await executeStub.returnValues[0];
      expect(element.$.directory.path).to.equal('/directory/coverage/entry-1');
      expect(element._refresh).to.have.been.called;
      window.confirm.restore();
    });

    test('should encode directory and id path segments when deleting', async () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves();
      const item = {
        directoryName: 'my vocabulary',
        properties: { id: 'entry one' },
      };

      element._deleteEntry({ target: { parentNode: { item } } });
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/my%20vocabulary/entry%20one');
      window.confirm.restore();
    });

    test('should not double encode already encoded id when deleting', async () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves();
      const item = {
        directoryName: 'my vocabulary',
        properties: { id: 'entry%20one' },
      };

      element._deleteEntry({ target: { parentNode: { item } } });
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/my%20vocabulary/entry%20one');
      window.confirm.restore();
    });

    test('should encode id starting with @ when deleting', async () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').resolves();
      const item = {
        directoryName: 'language',
        properties: { id: '@test' },
      };

      element._deleteEntry({ target: { parentNode: { item } } });
      await executeStub.returnValues[0];

      expect(element.$.directory.path).to.equal('/directory/language/%40test');
      window.confirm.restore();
    });

    test('should notify on 409 conflict when deleting', async () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element, 'notify');
      const executeStub = sinon.stub(element, '_executeDirectoryRequest').rejects({ status: 409 });
      const item = { directoryName: 'coverage', properties: { id: 'x' } };
      element._deleteEntry({ target: { parentNode: { item } } });
      await executeStub.returnValues[0].catch(() => {});
      expect(element.notify).to.have.been.called;
      window.confirm.restore();
    });
  });

  suite('_elementChanged', () => {
    test('should notify dialog resize when dialog is open', () => {
      element.$.vocabularyEditDialog = {
        opened: true,
        notifyResize: sinon.spy(),
      };
      sinon.stub(element, 'async').callsFake((fn) => fn());
      element._elementChanged();
      expect(element.$.vocabularyEditDialog.notifyResize).to.have.been.called;
      element.async.restore();
    });
  });

  suite('_save', () => {
    test('should return early when layout validation fails', () => {
      sinon.stub(element.$.layout, 'validate').returns(false);
      sinon.stub(element.$.directory, 'post');
      element._save();
      expect(element.$.directory.post).to.not.have.been.called;
      element.$.layout.validate.restore();
    });
  });

  suite('_getSchemaFields', () => {
    test('should use entry properties when entries already loaded', async () => {
      element._selectedSchema = 'coverage';
      element.entries = [{ properties: { id: '1', label: 'L' } }];
      const fields = await element._getSchemaFields();
      expect(fields).to.include.members(['id', 'label']);
    });
  });

  suite('data-table cell wrapping styles', () => {
    // Long labels in the vocabulary table used to be truncated with ellipsis.
    // The element's <style> block overrides the cell host CSS so long values
    // wrap onto multiple lines and remain fully visible.
    const getStyleText = (el) =>
      Array.from(el.shadowRoot.querySelectorAll('style'))
        .map((s) => s.textContent)
        .join('\n');

    test('should target non-header data-table cells', () => {
      expect(getStyleText(element)).to.match(/nuxeo-data-table-cell:not\(\[header\]\)/);
    });

    test('should allow text to wrap onto multiple lines', () => {
      const css = getStyleText(element);
      expect(css).to.match(/white-space:\s*normal/);
      expect(css).to.match(/word-break:\s*break-word/);
    });

    test('should make cell content visible (no overflow clipping)', () => {
      const css = getStyleText(element);
      expect(css).to.match(/overflow-x:\s*visible/);
      expect(css).to.match(/overflow-y:\s*visible/);
    });

    test('should top-align wrapped content with vertical padding', () => {
      const css = getStyleText(element);
      expect(css).to.match(/align-items:\s*flex-start/);
      expect(css).to.match(/padding-top:\s*12px/);
      expect(css).to.match(/padding-bottom:\s*12px/);
    });

    test('should apply wrapping styles to a real data-table cell', async () => {
      // Render a non-header cell inside the element and verify the host CSS
      // declared in the element's style block is the one in effect.
      const host = document.createElement('div');
      host.attachShadow({ mode: 'open' });
      host.shadowRoot.innerHTML = `
        <style>${getStyleText(element)}</style>
        <nuxeo-data-table-cell>A very very long label that should wrap onto multiple lines</nuxeo-data-table-cell>
      `;
      document.body.appendChild(host);
      const cell = host.shadowRoot.querySelector('nuxeo-data-table-cell');
      const styles = window.getComputedStyle(cell);
      expect(styles.whiteSpace).to.equal('normal');
      expect(styles.overflowX).to.equal('visible');
      expect(styles.overflowY).to.equal('visible');
      expect(styles.alignItems).to.equal('flex-start');
      document.body.removeChild(host);
    });

    test('should not apply wrapping styles to header cells', () => {
      // The override is scoped via :not([header]) so header cells keep their
      // default ellipsis behaviour.
      const css = getStyleText(element);
      const blockMatch = css.match(/nuxeo-data-table-cell:not\(\[header\]\)\s*{([^}]*)}/);
      expect(blockMatch, 'expected a scoped non-header cell rule').to.be.ok;
      // The opposite (header) selector should not appear in our override block.
      expect(css).to.not.match(/nuxeo-data-table-cell\[header\]\s*{[^}]*white-space:\s*normal/);
    });
  });
});
