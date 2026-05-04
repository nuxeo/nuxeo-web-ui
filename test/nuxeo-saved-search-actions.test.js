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
import '../elements/search/nuxeo-saved-search-actions.js';

function createMockSearchForm() {
  const form = document.createElement('div');
  form.dirty = false;
  form.visible = true;
  form.isSavedSearch = false;
  form.selectedSearch = null;
  form.save = sinon.spy();
  form.saveAs = sinon.spy();
  form.rename = sinon.spy();
  form.share = sinon.spy();
  form.delete = sinon.spy();
  return form;
}

suite('nuxeo-saved-search-actions', () => {
  let actions;

  setup(async () => {
    actions = await fixture(html`<nuxeo-saved-search-actions></nuxeo-saved-search-actions>`);
    await flush();
  });

  test('delegates action methods to search form', () => {
    const form = createMockSearchForm();
    actions.searchForm = form;

    actions._saveSearch();
    actions._saveSearchAs();
    actions._renameSearch();
    actions._shareSearch();
    actions._deleteSearch();

    expect(form.save).to.have.been.calledOnce;
    expect(form.saveAs).to.have.been.calledOnce;
    expect(form.rename).to.have.been.calledOnce;
    expect(form.share).to.have.been.calledOnce;
    expect(form.delete).to.have.been.calledOnce;
  });

  test('has write permissions only when WriteProperties is present', () => {
    actions.searchDoc = {
      contextParameters: {
        permissions: ['Read', 'WriteProperties'],
      },
    };
    expect(actions._hasPermissions()).to.be.true;

    actions.searchDoc = {
      contextParameters: {
        permissions: ['Read'],
      },
    };
    expect(actions._hasPermissions()).to.be.false;

    actions.searchDoc = null;
    expect(actions._hasPermissions()).to.be.false;
  });

  test('computes visibility for save-as action', () => {
    actions._isSearchFormVisible = true;
    actions._dirty = false;
    actions.isSavedSearch = true;
    expect(actions._showSaveAs()).to.be.true;

    actions.isSavedSearch = false;
    actions.searchForm = createMockSearchForm();
    actions._dirty = true;
    expect(actions._showSaveAs()).to.be.true;

    actions._isSearchFormVisible = false;
    expect(actions._showSaveAs()).to.be.false;
  });

  test('computes visibility for save and other actions', () => {
    sinon.stub(actions, '_hasPermissions').returns(true);
    actions._isSearchFormVisible = true;
    actions.isSavedSearch = true;
    actions._dirty = true;

    expect(actions._showSave()).to.be.true;
    expect(actions._showOtherSearchActions()).to.be.true;

    actions._dirty = false;
    expect(actions._showSave()).to.be.false;
    expect(actions._showOtherSearchActions()).to.be.true;

    actions._hasPermissions.restore();
  });

  test('syncs state when search form changes and reacts to events', async () => {
    const oldForm = createMockSearchForm();
    const newForm = createMockSearchForm();
    newForm.dirty = true;
    newForm.visible = false;
    newForm.isSavedSearch = true;
    newForm.selectedSearch = { id: 'saved-1' };

    const oldRemoveSpy = sinon.spy(oldForm, 'removeEventListener');
    actions.searchForm = oldForm;
    await flush();
    actions.searchForm = newForm;
    await flush();

    expect(actions._dirty).to.be.true;
    expect(actions.searchId).to.equal('saved-1');
    expect(actions.isSavedSearch).to.be.true;
    expect(actions._isSearchFormVisible).to.be.false;
    expect(oldRemoveSpy).to.have.been.calledWith('visible-changed', actions._searchFormVisibilityChanged);

    newForm.dirty = false;
    newForm.dispatchEvent(new CustomEvent('dirty-changed'));
    expect(actions._dirty).to.be.false;

    newForm.isSavedSearch = false;
    newForm.selectedSearch = { id: 'saved-2' };
    newForm.dispatchEvent(new CustomEvent('selected-search-changed'));
    expect(actions.isSavedSearch).to.be.false;
    expect(actions.searchId).to.equal('saved-2');

    newForm.visible = true;
    newForm.dispatchEvent(new CustomEvent('visible-changed'));
    expect(actions._isSearchFormVisible).to.be.true;
  });
});
