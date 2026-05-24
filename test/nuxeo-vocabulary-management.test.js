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

    test('should match entries whose cell value is in the dropdown selection', () => {
      element._filters = { id: ['apple', 'banana'] };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple', 'banana']);
    });

    test('should treat an empty dropdown selection as no filter on that column', () => {
      element._filters = { id: [] };
      element._applyFilters();
      expect(element.entries).to.have.lengthOf(4);
    });

    test('should AND multiple column filters together', () => {
      element._filters = { id: ['apple', 'apricot'], label: ['Apricot'] };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apricot']);
    });

    test('should keep starts-with matching when filter is a string (back-compat)', () => {
      element._filters = { id: 'ap' };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple', 'apricot']);
    });

    test('should be case-insensitive for string filters', () => {
      element._filters = { id: 'AP' };
      element._applyFilters();
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple', 'apricot']);
    });

    test('should ignore entries with no properties', () => {
      element._allEntries = [{}, { properties: { id: 'apple' } }];
      element._filters = { id: ['apple'] };
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

  suite('_filterByFor', () => {
    test('should return the column key for filterable columns', () => {
      expect(element._filterByFor({ key: 'id' })).to.equal('id');
    });

    test('should return empty string for the actions column', () => {
      expect(element._filterByFor({ key: 'actions' })).to.equal('');
    });

    test('should return empty string for an undefined column', () => {
      expect(element._filterByFor(undefined)).to.equal('');
    });
  });

  suite('_aggregationData', () => {
    test('should return the bucket data for the given key', () => {
      const aggs = { id: { extendedBuckets: [{ key: 'a', label: 'a', docCount: 1 }], selection: [] } };
      expect(element._aggregationData(aggs, 'id')).to.equal(aggs.id);
    });

    test('should return undefined when aggregations or key are missing', () => {
      expect(element._aggregationData(undefined, 'id')).to.be.undefined;
      expect(element._aggregationData({}, '')).to.be.undefined;
    });
  });

  suite('_computeAggregations', () => {
    test('should produce a bucket per distinct value of every non-action column', () => {
      const entries = [
        { properties: { id: 'apple', label: 'Apple' } },
        { properties: { id: 'apple', label: 'Apple' } },
        { properties: { id: 'banana', label: 'Banana' } },
      ];
      const cols = [{ key: 'id' }, { key: 'label' }, { key: 'actions' }];
      const aggs = element._computeAggregations(entries, cols);
      expect(aggs).to.have.keys(['id', 'label']);
      const idBuckets = aggs.id.extendedBuckets;
      const apple = idBuckets.find((b) => b.key === 'apple');
      const banana = idBuckets.find((b) => b.key === 'banana');
      expect(apple).to.deep.equal({ key: 'apple', label: 'apple', docCount: 2 });
      expect(banana).to.deep.equal({ key: 'banana', label: 'banana', docCount: 1 });
      expect(aggs.id.selection).to.deep.equal([]);
    });

    test('should sort buckets alphabetically by label', () => {
      const entries = [
        { properties: { id: 'charlie' } },
        { properties: { id: 'alpha' } },
        { properties: { id: 'bravo' } },
      ];
      const aggs = element._computeAggregations(entries, [{ key: 'id' }]);
      expect(aggs.id.extendedBuckets.map((b) => b.key)).to.deep.equal(['alpha', 'bravo', 'charlie']);
    });

    test('should skip empty cell values', () => {
      const entries = [{ properties: { id: '' } }, { properties: { id: 'apple' } }, { properties: {} }];
      const aggs = element._computeAggregations(entries, [{ key: 'id' }]);
      expect(aggs.id.extendedBuckets.map((b) => b.key)).to.deep.equal(['apple']);
    });

    test('should return an empty object when inputs are not arrays', () => {
      expect(element._computeAggregations(null, [{ key: 'id' }])).to.deep.equal({});
      expect(element._computeAggregations([], null)).to.deep.equal({});
    });
  });

  suite('_onColumnFilterChanged', () => {
    setup(() => {
      element._allEntries = [{ properties: { id: 'apple' } }, { properties: { id: 'banana' } }];
      element._filters = {};
    });

    function makeEvent(filterBy, value) {
      return { detail: { filterBy, value } };
    }

    test('should record a non-empty selection and re-apply filters', () => {
      element._onColumnFilterChanged(makeEvent('id', ['apple']));
      expect(element._filters).to.deep.equal({ id: ['apple'] });
      expect(element.entries.map((e) => e.properties.id)).to.deep.equal(['apple']);
    });

    test('should drop the column filter when the selection is cleared', () => {
      element._filters = { id: ['apple'] };
      element._onColumnFilterChanged(makeEvent('id', []));
      expect(element._filters).to.deep.equal({});
      expect(element.entries).to.have.lengthOf(2);
    });

    test('should drop the column filter when value is null/undefined', () => {
      element._filters = { id: ['apple'] };
      element._onColumnFilterChanged(makeEvent('id', null));
      expect(element._filters).to.deep.equal({});
    });

    test('should ignore events for the actions column', () => {
      const applySpy = sinon.spy(element, '_applyFilters');
      try {
        element._onColumnFilterChanged(makeEvent('actions', ['x']));
        expect(applySpy).to.not.have.been.called;
        expect(element._filters).to.deep.equal({});
      } finally {
        applySpy.restore();
      }
    });

    test('should ignore events with no detail or no filterBy', () => {
      const applySpy = sinon.spy(element, '_applyFilters');
      try {
        element._onColumnFilterChanged({});
        element._onColumnFilterChanged(makeEvent('', ['x']));
        expect(applySpy).to.not.have.been.called;
      } finally {
        applySpy.restore();
      }
    });
  });

  suite('_syncFilterDropdowns', () => {
    test('should no-op when aggregations is falsy', () => {
      const asyncSpy = sinon.spy(element, 'async');
      try {
        element._syncFilterDropdowns(null);
        element._syncFilterDropdowns(undefined);
        expect(asyncSpy).to.not.have.been.called;
      } finally {
        asyncSpy.restore();
      }
    });

    test('should no-op when this.$.table is missing', () => {
      const asyncSpy = sinon.spy(element, 'async');
      const originalTable = element.$.table;
      delete element.$.table;
      try {
        element._syncFilterDropdowns({ id: { extendedBuckets: [], selection: [] } });
        expect(asyncSpy).to.not.have.been.called;
      } finally {
        if (originalTable) {
          element.$.table = originalTable;
        }
        asyncSpy.restore();
      }
    });

    test('should push aggregation data onto each rendered dropdown by column key', () => {
      const ddWithHost = { data: null, parentNode: { host: { column: { key: 'id' } } } };
      const ddWithClosest = {
        data: null,
        parentNode: {},
        closest: (sel) => (sel === 'nuxeo-data-table-cell' ? { column: { key: 'label' } } : null),
      };
      const ddFallbackToParent = { data: null, parentNode: { column: { key: 'obsolete' } } };
      const ddWithoutKey = { data: null, parentNode: {} };
      const dropdowns = [ddWithHost, ddWithClosest, ddFallbackToParent, ddWithoutKey];
      element.$.table = { querySelectorAll: () => dropdowns };

      const aggregations = {
        id: { extendedBuckets: [{ key: 'a' }], selection: [] },
        label: { extendedBuckets: [{ key: 'b' }], selection: [] },
        // obsolete intentionally omitted to exercise `aggregations[key]` falsy branch
      };
      sinon.stub(element, 'async').callsFake((fn) => fn());
      try {
        element._syncFilterDropdowns(aggregations);
        expect(ddWithHost.data).to.equal(aggregations.id);
        expect(ddWithClosest.data).to.equal(aggregations.label);
        expect(ddFallbackToParent.data).to.be.null;
        expect(ddWithoutKey.data).to.be.null;
      } finally {
        element.async.restore();
      }
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

    test('should expose the unfiltered entry list (not the filtered display list)', () => {
      // Set selectedVocabulary first; its observer (_refresh) resets _allEntries.
      element.selectedVocabulary = 'coverage';
      const all = [{ properties: { id: 'a' } }, { properties: { id: 'b' } }];
      element._allEntries = all;
      element.entries = [all[0]];
      element._selectedEntry = { directoryName: 'coverage' };
      const model = element._layoutModel();
      expect(model.entries).to.equal(all);
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
      element.selectedVocabulary = 'coverage';
      element._allEntries = [{ properties: { id: '1', label: 'L' } }];
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
