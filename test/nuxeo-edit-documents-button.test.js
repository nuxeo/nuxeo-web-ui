/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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
import '@webcomponents/html-imports/html-imports.min.js';
import { Polymer } from '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import { fixture, html, flush, waitForEvent, waitForAttrMutation, isElementVisible } from '@nuxeo/testing-helpers';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-directory-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import '../elements/bulk/nuxeo-edit-documents-button.js';
import '../elements/nuxeo-dropzone/nuxeo-dropzone.js';

// Export Polymer and PolymerElement for 1.x and 2.x compat
window.Polymer = Polymer;
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['bulkWidget.error.addValuesWithEmpty'] = 'Please enter the value(s) to add';
window.nuxeo.I18n.en['bulkWidget.error.replaceWithEmpty'] = 'Please enter the value to replace this field with';
window.nuxeo.I18n.en['bulkWidget.mode.keep'] = "Don't change value(s)";
window.nuxeo.I18n.en['bulkWidget.mode.remove'] = 'Empty value(s)';
window.nuxeo.I18n.en['bulkWidget.mode.replace'] = 'Replace with';
window.nuxeo.I18n.en['bulkWidget.warning.bool'] = 'This field will be unchecked for all selected documents';
window.nuxeo.I18n.en['bulkWidget.warning.remove'] = 'This field will be emptied for all selected documents';
window.nuxeo.I18n.en['bulkWidget.warning.required'] = 'This field requires a non empty value';
window.nuxeo.I18n.en['command.add'] = 'Add';
window.nuxeo.I18n.en['command.cancel'] = 'Cancel';
window.nuxeo.I18n.en['command.save'] = 'Save';
window.nuxeo.I18n.en['dropzone.add'] = 'Upload main file';
window.nuxeo.I18n.en['dublincoreEdit.directorySuggestion.placeholder'] = 'Select a value.';
window.nuxeo.I18n.en['label.dublincore.coverage'] = 'Coverage';
window.nuxeo.I18n.en['label.dublincore.expire'] = 'Expires';
window.nuxeo.I18n.en['label.dublincore.nature'] = 'Nature';
window.nuxeo.I18n.en['label.dublincore.subjects'] = 'Subjects';

Nuxeo = Nuxeo || {};
Nuxeo.LayoutBehavior = LayoutBehavior;

// XXX Copied from https://github.com/nuxeo/nuxeo-elements/blob/maintenance-3.0.x/ui/test/ui-test-helpers.js
// should be refactored and moved to the public helpers in nuxeo-elements (see ELEMENTS-1437 & WEBUI-604)
function waitForLayoutLoad(layout) {
  return Promise.race([waitForEvent(layout, 'element-changed'), waitForAttrMutation(layout.$.error, 'hidden', null)]);
}

// XXX Copied from https://github.com/nuxeo/nuxeo-elements/blob/maintenance-3.0.x/ui/test/nuxeo-document-picker.test.js
// should be refactored and moved to the public helpers in nuxeo-elements (see ELEMENTS-1437 & WEBUI-604)
const waitForDialogOpen = async (dialog) => {
  if (!isElementVisible(dialog)) {
    await waitForEvent(dialog, 'iron-overlay-opened');
    await flush();
  }
};

// XXX Copied from https://github.com/nuxeo/nuxeo-elements/blob/maintenance-3.0.x/ui/test/nuxeo-document-picker.test.js
// should be refactored and moved to the public helpers in nuxeo-elements (see ELEMENTS-1437 & WEBUI-604)
const waitForDialogClose = async (dialog) => {
  if (isElementVisible(dialog)) {
    await waitForEvent(dialog, 'iron-overlay-closed');
    await flush();
  }
};

// determine base module path (relies on @open-wc/webpack-import-meta-loader)
const { url } = import.meta;
const base = url.substring(0, url.lastIndexOf('/'));
const baseUrl = `${base}/layouts/bulk/`;

const schemas = () =>
  Promise.resolve([
    {
      name: 'dublincore',
      '@prefix': 'dc',
      fields: {
        description: 'string',
        language: 'string',
        coverage: 'string',
        valid: 'date',
        creator: 'string',
        modified: 'date',
        lastContributor: 'string',
        rights: 'string',
        expired: 'date',
        format: 'string',
        created: 'date',
        title: 'string',
        issued: 'date',
        nature: 'string',
        subjects: 'string[]',
        contributors: 'string[]',
        source: 'string',
        publisher: 'string',
      },
    },
    {
      name: 'custom',
      '@prefix': 'custom',
      fields: {
        bool: 'boolean',
        blob: 'blob',
        blobRequired: 'blob',
        strings: 'string',
        stringsRequired: 'string',
        complex: {
          fields: {
            substring: 'string',
            substringRequired: 'string',
          },
          type: 'complex',
        },
        complexList: {
          fields: {
            first: 'string',
            second: 'string',
          },
          type: 'complex[]',
        },
      },
    },
  ]);

suite('nuxeo-edit-documents-button', () => {
  let button;

  const buildButton = async (layoutId = 'default') => {
    const documents = ['the content of this array is irrelevant'];
    const actionButton = await fixture(
      html`
        <nuxeo-edit-documents-button
          href-base="${baseUrl}"
          layout="${layoutId}"
          .documents="${documents}"
          ._fetchSchemas="${schemas}"
        >
        </nuxeo-edit-documents-button>
      `,
    );
    const bulkLayout = actionButton.$$('nuxeo-layout');
    if (!bulkLayout.element) {
      await waitForLayoutLoad(bulkLayout);
    }
    await flush();
    return actionButton;
  };

  const getWidget = (xpath) => button._getBoundElementFromPath(`document.properties.${xpath}`);
  const getBulkWidget = (boundElement) => button._getBulkWidget(boundElement);

  suite('Default Layout', () => {
    test('Should open, close and reopen the bulk edit action dialog', async () => {
      button = await buildButton();
      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // check that dialog is closed
      expect(dialog.opened).to.be.false;
      expect(isElementVisible(dialog)).to.be.false;
      expect(isElementVisible(cancelButton)).to.be.false;
      // open the bulk edit dialog
      button.$$('.action').click();
      await waitForDialogOpen(dialog);
      // check that dialog is open
      expect(dialog.opened).to.be.true;
      expect(isElementVisible(dialog)).to.be.true;
      expect(isElementVisible(cancelButton)).to.be.true;
      // click the cancel button
      cancelButton.click();
      await waitForDialogClose(dialog);
      // check that dialog is closed
      expect(dialog.opened).to.be.false;
      expect(isElementVisible(dialog)).to.be.false;
      expect(isElementVisible(cancelButton)).to.be.false;
      // reopen the bulk edit dialog
      button.$$('.action').click();
      await waitForDialogOpen(dialog);
      // check that dialog is open
      expect(dialog.opened).to.be.true;
      expect(isElementVisible(dialog)).to.be.true;
      expect(isElementVisible(cancelButton)).to.be.true;
    });

    test('Should disable the save button if there are no properties to update', async () => {
      button = await buildButton();
      const { save } = button.$;
      const expiredWidget = getWidget('dc:expired');
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that dc:expired is unset
      expect(expiredWidget.value).to.be.null;
      // check that save button is disabled
      expect(save.disabled).to.be.true;
      // set a dc:expired date
      expiredWidget.value = new Date();
      // check that save button is enabled
      expect(save.disabled).to.be.false;
      // clear the dc:expired date
      expiredWidget.value = null;
      // check that save button is disabled
      expect(save.disabled).to.be.true;
    });

    test('Should change the update mode when a property value is filled and cleared', async () => {
      button = await buildButton();
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that update mode is set to keep
      expect(expiredBulkWidget.updateMode).to.be.equals('keep');
      // set a dc:expired date
      expiredWidget.value = new Date();
      // check that update mode is set to replace
      expect(expiredBulkWidget.updateMode).to.be.equals('replace');
      // clear the dc:expired date
      expiredWidget.value = null;
      // check that update mode is set to keep
      expect(expiredBulkWidget.updateMode).to.be.equals('keep');
    });

    test('Should clear the value when the update mode is set to keep values', async () => {
      button = await buildButton();
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // set a dc:expired date
      expiredWidget.value = new Date();
      // set update mode to keep
      expiredBulkWidget.updateMode = 'keep';
      // check that value is unset
      expect(expiredWidget.value).to.be.null;
    });

    test('Should clear the value when the update mode is set to remove values', async () => {
      button = await buildButton();
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // set a dc:expired date
      expiredWidget.value = new Date();
      // set update mode to remove
      expiredBulkWidget.updateMode = 'remove';
      // check that value is unset
      expect(expiredWidget.value).to.be.null;
    });

    test('Should disable the widget when the update mode is set to remove values', async () => {
      button = await buildButton();
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that widget is enabled
      expect(expiredWidget.disabled).to.be.false;
      // set update mode to remove
      expiredBulkWidget.updateMode = 'remove';
      // check that widget is disabled
      expect(expiredWidget.disabled).to.be.true;
      // set update mode to keep
      expiredBulkWidget.updateMode = 'keep';
      // check that widget is enabled
      expect(expiredWidget.disabled).to.be.false;
    });

    test('Should enable the save button when the update mode is set to remove values', async () => {
      button = await buildButton();
      const { save } = button.$;
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that save button is disabled
      expect(save.disabled).to.be.true;
      // set update mode to remove
      expiredBulkWidget.updateMode = 'remove';
      // check that save button is enabled
      expect(save.disabled).to.be.false;
      // set update mode to keep
      expiredBulkWidget.updateMode = 'keep';
      // check that save button is disabled
      expect(save.disabled).to.be.true;
    });

    test('Should show a warning when the update mode is set to remove values', async () => {
      button = await buildButton();
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that message is empty
      expect(expiredBulkWidget._message).to.be.undefined;
      // set update mode to remove
      expiredBulkWidget.updateMode = 'remove';
      // check that message is shown
      expect(expiredBulkWidget._message).to.be.equals('This field will be emptied for all selected documents');
      // set update mode to keep
      expiredBulkWidget.updateMode = 'keep';
      // check that message is empty
      expect(expiredBulkWidget._message).to.be.undefined;
    });

    test('Should show a warning when the form is submitted trying to replace a property without a value', async () => {
      button = await buildButton();
      const { dialog, save } = button.$;
      const expiredWidget = getWidget('dc:expired');
      const expiredBulkWidget = getBulkWidget(expiredWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      await waitForDialogOpen(dialog);
      // check that message is empty
      expect(expiredBulkWidget._message).to.be.undefined;
      // set update mode to replace
      expiredBulkWidget.updateMode = 'replace';
      // check that message is empty
      expect(expiredBulkWidget._message).to.be.undefined;
      // click the save button
      save.click();
      // check that dialog is still open
      expect(isElementVisible(dialog)).to.be.true;
      // check that message is shown
      expect(expiredBulkWidget._message).to.be.equals('Please enter the value to replace this field with');
      // set a dc:expired date
      expiredWidget.value = new Date();
      // check that message is empty
      expect(expiredBulkWidget._message).to.be.undefined;
    });

    test('Should show a warning on submission when trying to add a property without a value', async () => {
      button = await buildButton();
      const { dialog, save } = button.$;
      const subjectsWidget = getWidget('dc:subjects');
      const subjectsBulkWidget = getBulkWidget(subjectsWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      await waitForDialogOpen(dialog);
      // check that message is empty
      expect(subjectsBulkWidget._message).to.be.undefined;
      // set update mode to addValues
      subjectsBulkWidget.updateMode = 'addValues';
      // check that message is empty
      expect(subjectsBulkWidget._message).to.be.undefined;
      // click the save button
      save.click();
      // check that dialog is still open
      expect(isElementVisible(dialog)).to.be.true;
      // check that message is shown
      expect(subjectsBulkWidget._message).to.be.equals('Please enter the value(s) to add');
      // set a subject value
      subjectsWidget.value = ['art/architecture'];
      // check that message is empty
      expect(subjectsBulkWidget._message).to.be.undefined;
    });

    test('Should submit form when properties are modified correctly', async () => {
      button = await buildButton();
      const { dialog, save } = button.$;
      const natureWidget = getWidget('dc:nature');
      const natureBulkWidget = getBulkWidget(natureWidget);
      const expiredWidget = getWidget('dc:expired');
      // open the bulk edit dialog
      button.$$('.action').click();
      await waitForDialogOpen(dialog);
      // set dc:nature update mode to remove
      natureBulkWidget.updateMode = 'remove';
      // set a dc:expired date
      expiredWidget.value = new Date();
      // click the save button
      save.click();
      await waitForDialogClose(dialog);
      // check that dialog is closed
      expect(isElementVisible(dialog)).to.be.false;
    });

    test('Should show the append option only if the field is multivalued', async () => {
      button = await buildButton();
      const { dialog } = button.$;
      // open the bulk edit dialog
      button.$$('.action').click();
      await waitForDialogOpen(dialog);
      const natureWidget = getWidget('dc:nature');
      const natureBulkWidget = getBulkWidget(natureWidget);
      const natureAddValues = natureBulkWidget.shadowRoot.getElementById('addValues');
      expect(natureAddValues.disabled).to.be.true;
      const subjectsWidget = getWidget('dc:subjects');
      const subjectsBulkWidget = getBulkWidget(subjectsWidget);
      const subjectsAddValues = subjectsBulkWidget.shadowRoot.getElementById('addValues');
      expect(subjectsAddValues.disabled).to.be.false;
    });
  });

  suite('Custom Layout', () => {
    test('Should handle widgets for boolean properties', async () => {
      button = await buildButton('custom');
      const boolWidget = getWidget('custom:bool');
      const boolBulkWidget = getBulkWidget(boolWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that bool is unset
      expect(boolWidget.checked).to.be.null;
      // check that update mode is set to keep
      expect(boolBulkWidget.updateMode).to.be.equals('keep');
      // check that message is empty
      expect(boolBulkWidget._message).to.be.undefined;
      // click the widget to check the bool property
      boolWidget.click();
      // check that bool is true
      expect(boolWidget.checked).to.be.true;
      // check that  update mode is set to replace
      expect(boolBulkWidget.updateMode).to.be.equals('replace');
      // check that message is empty
      expect(boolBulkWidget._message).to.be.undefined;
      // click the widget to uncheck the bool property
      boolWidget.click();
      // check that bool is false
      expect(boolWidget.checked).to.be.false;
      // check that update mode is set to replace
      expect(boolBulkWidget.updateMode).to.be.equals('replace');
      // check that message is shown
      expect(boolBulkWidget._message).to.be.equals('This field will be unchecked for all selected documents');
    });

    test('Should handle widgets for blob properties', async () => {
      button = await buildButton('custom');
      const blobWidget = getWidget('custom:blob');
      const blobBulkWidget = getBulkWidget(blobWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that blob is unset
      expect(blobWidget.value).to.be.null;
      // check that update mode is set to keep
      expect(blobBulkWidget.updateMode).to.be.equals('keep');
      // simulate the upload of a blob
      blobWidget.value = {
        'upload-batch': 'batchId-random-hash',
        'upload-fileId': '0',
      };
      // check that update mode is set to replace
      expect(blobBulkWidget.updateMode).to.be.equals('replace');
    });

    test('Should handle required widgets for blob properties', async () => {
      button = await buildButton('custom');
      const blobWidget = getWidget('custom:blobRequired');
      const blobBulkWidget = getBulkWidget(blobWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that widget is not marked as required
      expect(blobWidget.required).to.be.null;
      // check that bulk widget is tagged as required
      expect(blobBulkWidget._required).to.be.true;
      // check that message is shown
      expect(blobBulkWidget._message).to.be.equals('This field requires a non empty value');
      // check that remove update mode is disabled
      expect(blobBulkWidget.$$('paper-item#remove').disabled).to.be.true;
    });

    test('Should handle widgets bound to string subfields', async () => {
      button = await buildButton('custom');
      const substringWidget = getWidget('custom:complex.substring');
      const substringBulkWidget = getBulkWidget(substringWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that string is unset
      expect(substringWidget.value).to.be.null;
      // check that update mode is set to keep
      expect(substringBulkWidget.updateMode).to.be.equals('keep');
      // set a substring value
      substringWidget.value = 'String value';
      // check that update mode is set to replace
      expect(substringBulkWidget.updateMode).to.be.equals('replace');
    });

    test('Should handle required widgets bound to string subfields', async () => {
      button = await buildButton('custom');
      const substringWidget = getWidget('custom:complex.substringRequired');
      const substringBulkWidget = getBulkWidget(substringWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that widget is not marked as required
      expect(substringWidget.required).to.be.null;
      // check that bulk widget is tagged as required
      expect(substringBulkWidget._required).to.be.true;
      // check that message is shown
      expect(substringBulkWidget._message).to.be.equals('This field requires a non empty value');
      // check that remove update mode is disabled
      expect(substringBulkWidget.$$('paper-item#remove').disabled).to.be.true;
    });

    test('Should handle widgets for multivalued properties', async () => {
      button = await buildButton('custom');
      const stringsWidget = getWidget('custom:strings');
      const stringsBulkWidget = getBulkWidget(stringsWidget);
      // open the bulk edit dialog
      button.$$('.action').click();
      // check that strings is unset
      expect(stringsWidget.items).to.be.null;
      // check that update mode is set to keep
      expect(stringsBulkWidget.updateMode).to.be.equals('keep');
      // set a strings value
      stringsWidget.items = ['Entry'];
      // check that update mode is set to replace
      expect(stringsBulkWidget.updateMode).to.be.equals('replace');
    });

    test('Should handle widgets for complex list properties', async () => {
      button = await buildButton('custom');
      // open the bulk edit dialog
      button.$$('.action').click();
      const stringsWidget = getWidget('custom:strings');
      const stringsBulkWidget = getBulkWidget(stringsWidget);
      const stringsAddValues = stringsBulkWidget.shadowRoot.getElementById('addValues');
      expect(stringsAddValues.disabled).to.be.true;
      const complexListWidget = getWidget('custom:complexList');
      const complexListBulkWidget = getBulkWidget(complexListWidget);
      const complexListAddValues = complexListBulkWidget.shadowRoot.getElementById('addValues');
      expect(complexListAddValues.disabled).to.be.false;
    });
  });
});
