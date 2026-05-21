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
      { name: 'coverage', schema: 'coverage', parent: '' },
      { name: 'continent', schema: 'xvocabulary', parent: 'coverage' },
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
      expect(element._visibleDataTableStyle([{ id: '1' }], [], {})).to.equal('display: block;');
    });

    test('should return display none when entries is empty and no filter', () => {
      expect(element._visibleDataTableStyle([], [], {})).to.equal('display: none;');
    });

    test('should return display block when a filter is active even with no matches', () => {
      expect(element._visibleDataTableStyle([], [{ id: 'x' }], { id: 'z' })).to.equal('display: block;');
    });

    test('should return display none when filter is active but source is empty', () => {
      expect(element._visibleDataTableStyle([], [], { id: 'z' })).to.equal('display: none;');
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

  suite('_cellValue', () => {
    test('should return item property value', () => {
      const item = { properties: { id: 'entry1', label: 'Entry 1' } };
      expect(element._cellValue(item, 'label')).to.equal('Entry 1');
    });

    test('should return i18n yes key for obsolete property > 0', () => {
      expect(element._cellValue({ properties: { obsolete: 1 } }, 'obsolete')).to.equal('label.yes');
    });

    test('should return i18n no key for obsolete property = 0', () => {
      expect(element._cellValue({ properties: { obsolete: 0 } }, 'obsolete')).to.equal('label.no');
    });

    test('should return undefined for property not in item', () => {
      expect(element._cellValue({ properties: { id: 'entry1' } }, 'missing')).to.be.undefined;
    });

    test('should return N/A when item is missing', () => {
      expect(element._cellValue(null, 'id')).to.equal('N/A');
    });

    test('should return N/A when item has no properties', () => {
      expect(element._cellValue({}, 'id')).to.equal('N/A');
    });

    test('should return N/A when prop is empty', () => {
      expect(element._cellValue({ properties: { id: 'entry1' } }, '')).to.equal('N/A');
    });
  });

  suite('_formattedFilterableValue', () => {
    test('should stringify property value', () => {
      expect(element._formattedFilterableValue({ properties: { id: 'abc' } }, 'id')).to.equal('abc');
    });

    test('should coerce numbers to string', () => {
      expect(element._formattedFilterableValue({ properties: { ordering: 5 } }, 'ordering')).to.equal('5');
    });

    test('should return empty string when value is null/undefined', () => {
      expect(element._formattedFilterableValue({ properties: {} }, 'missing')).to.equal('');
      expect(element._formattedFilterableValue(null, 'id')).to.equal('');
    });

    test('should return i18n yes/no for obsolete', () => {
      expect(element._formattedFilterableValue({ properties: { obsolete: 1 } }, 'obsolete')).to.equal('label.yes');
      expect(element._formattedFilterableValue({ properties: { obsolete: 0 } }, 'obsolete')).to.equal('label.no');
    });
  });

  suite('_applyFilters', () => {
    const allEntries = [
      { properties: { id: 'apple', label: 'Apple' } },
      { properties: { id: 'apricot', label: 'Apricot' } },
      { properties: { id: 'banana', label: 'Banana' } },
      { properties: { id: 'blueberry', label: 'Blueberry' } },
    ];

    setup(() => {
      element._allEntries = allEntries;
    });

    test('should expose all entries when no filter is set', () => {
      element._filters = {};
      element._applyFilters();
      expect(element.entries).to.have.lengthOf(4);
    });

    test('should keep only entries whose column starts with the filter term', () => {
      element._filters = { id: 'ap' };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple', 'apricot']);
    });

    test('should be case-insensitive', () => {
      element._filters = { id: 'AP' };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple', 'apricot']);
    });

    test('should only match at the start of the value, not anywhere', () => {
      element._filters = { id: 'ana' };
      element._applyFilters();
      expect(element.entries).to.have.lengthOf(0);
    });

    test('should AND multiple column filters together', () => {
      element._filters = { id: 'a', label: 'Apr' };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apricot']);
    });

    test('should ignore entries with no properties', () => {
      element._allEntries = [{}, { properties: { id: 'apple' } }];
      element._filters = { id: 'a' };
      element._applyFilters();
      expect(element.entries).to.have.lengthOf(1);
    });

    test('should return a fresh array (not the original reference) when no filter is set', () => {
      element._filters = {};
      element._applyFilters();
      expect(element.entries).to.not.equal(allEntries);
      expect(element.entries).to.deep.equal(allEntries);
    });
  });

  suite('_onAnyInput', () => {
    setup(() => {
      element._allEntries = [{ properties: { id: 'apple' } }, { properties: { id: 'banana' } }];
      element._filters = {};
    });

    function makeEvent({ key, value }) {
      const nativeInput = { value };
      const keyed = { dataset: { key } };
      return { composedPath: () => [nativeInput, keyed] };
    }

    test('should add a filter entry and re-apply', () => {
      element._onAnyInput(makeEvent({ key: 'id', value: 'ap' }));
      expect(element._filters).to.deep.equal({ id: 'ap' });
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple']);
    });

    test('should remove the filter when value is cleared', () => {
      element._filters = { id: 'ap' };
      element._onAnyInput(makeEvent({ key: 'id', value: '' }));
      expect(element._filters).to.deep.equal({});
      expect(element.entries).to.have.lengthOf(2);
    });

    test('should ignore events on the actions column', () => {
      const applySpy = sinon.spy(element, '_applyFilters');
      element._onAnyInput(makeEvent({ key: 'actions', value: 'foo' }));
      expect(applySpy).to.not.have.been.called;
      expect(element._filters).to.deep.equal({});
    });

    test('should ignore events without a keyed element in the path', () => {
      const applySpy = sinon.spy(element, '_applyFilters');
      element._onAnyInput({ composedPath: () => [{ value: 'x' }] });
      expect(applySpy).to.not.have.been.called;
    });

    test('should read value from the native input, not the shadow host', () => {
      const nativeInput = { value: 'app' };
      const paperInput = { dataset: { key: 'id' }, value: 'stale' };
      element._onAnyInput({ composedPath: () => [nativeInput, paperInput] });
      expect(element._filters.id).to.equal('app');
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
    test('should convert ordering to number', () => {
      element._selectedEntry = { properties: { ordering: '5', id: 'test' } };
      element._new = true;
      element.selectedVocabulary = 'coverage';
      // Stub the form validation and directory call
      const form = element.$.form;
      sinon.stub(form, 'validate').returns(true);
      const dirStub = sinon.stub(element.$.directory, 'post').resolves({});
      sinon.stub(element, '_refresh');
      sinon.stub(element, 'notify');
      element.$.vocabularyEditDialog = { toggle: sinon.stub() };
      element._save();
      expect(element._selectedEntry.properties.ordering).to.equal(5);
      dirStub.restore();
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
      sinon.stub(element.$.directory, 'remove').resolves();
      const item = {
        directoryName: 'coverage',
        properties: { id: 'entry-1' },
      };
      element._deleteEntry({ target: { parentNode: { item } } });
      await element.$.directory.remove.returnValues[0];
      expect(element.$.directory.path).to.equal('/directory/coverage/entry-1');
      expect(element._refresh).to.have.been.called;
      window.confirm.restore();
    });

    test('should notify on 409 conflict when deleting', async () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element, 'notify');
      sinon.stub(element.$.directory, 'remove').rejects({ status: 409 });
      const item = { directoryName: 'coverage', properties: { id: 'x' } };
      element._deleteEntry({ target: { parentNode: { item } } });
      await element.$.directory.remove.returnValues[0].catch(() => {});
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
});
