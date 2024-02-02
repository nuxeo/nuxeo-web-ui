/* eslint-disable no-await-in-loop */
import path from 'path';
import FieldRegistry from '../services/field_registry';

global.fieldRegistry = new FieldRegistry();
const suggestionGet = async (element) => {
  const multiElement = await element.getAttribute('multiple');
  const isMulti = multiElement !== null;
  if (isMulti) {
    const multiSelectivity = await element.elements('.selectivity-multiple-selected-item');
    const filedValues = [];
    for (let index = 0; index < multiSelectivity.length; index++) {
      const singleText = await multiSelectivity[index].getText();
      filedValues.push(singleText);
    }
    return filedValues.join(',');
  }
  const singleElement = await element.element('.selectivity-single-selected-item');
  const singleElementText = await singleElement.getText();
  return singleElementText;
};
const suggestionSet = async (element, value) => {
  const multiElement = await element.getAttribute('multiple');
  const isMulti = multiElement !== null;
  if (value) {
    const values = isMulti ? value.split(',') : [value];
    await element.waitForExist('#input');
    await element.scrollIntoView('#input');

    for (let i = 0; i < values.length; i++) {
      element.waitForVisible(isMulti ? 'input' : '#input');
      const currentElement = await element.element(isMulti ? 'input' : '.selectivity-caret');
      await currentElement.click();
      let dropdown = await element.element('.selectivity-dropdown:last-child');
      if (isMulti) {
        element.waitForVisible('.selectivity-multiple-input');
        const multipleInput = await element.element('.selectivity-multiple-input');
        await multipleInput.setValue(values[i]);
      } else {
        const singleSelectivity = await element.element('.selectivity-single-selected-item');
        const hasSelectedValue = await singleSelectivity.isExisting();
        await dropdown.waitForVisible('.selectivity-search-input');
        const searchInput = await dropdown.element('.selectivity-search-input');
        await searchInput.setValue(values[i]);
        if (hasSelectedValue) {
          const dropdownElement = await dropdown.element('.selectivity-result-item');
          await dropdownElement.waitForVisible();
          await driver.keys('Down arrow');
        }
      }
      try {
        dropdown = await element.element('.selectivity-dropdown:last-child');
        const dropdownHighlight = await dropdown.$('.selectivity-result-item.highlight');
        if (await dropdownHighlight.isVisible()) {
          const highLightText = await dropdownHighlight.getText();
          const hightlightTrimText = highLightText.trim();
          if (hightlightTrimText.includes(values[i])) {
            await dropdownHighlight.click();
            return true;
          }
          return false;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
  }
  // it's a reset
  else if (multiElement !== null) {
    const dropdown = await element.elements('.selectivity-multiple-selected-item');
    for (let i = 0; i < dropdown.length; i++) {
      const dropdownElement = await dropdown[i].element('.selectivity-multiple-selected-item-remove');
      await dropdownElement.click();
    }
  } else {
    const item = await element.element('.selectivity-single-selected-item');
    if (item) {
      const ele = await item.element('.selectivity-single-selected-item-remove');
      await ele.click();
    }
  }
};
global.fieldRegistry.register(
  'nuxeo-input',
  async (element) => element.$('.input-element input').getValue(),
  async (element, value) => {
    const ele = await element.$('.input-element input');
    await ele.setValue(value);
  },
);
global.fieldRegistry.register(
  'nuxeo-select',
  (element) => {
    element.$('.input-element input').getValue();
  },
  async (element, value) => {
    const input = await element.$('.input-element input');
    await input.click();
    await element.$('paper-item').waitForExist();
    const rows = await element.$$('paper-item');
    const elementTitle = await element.$$('paper-item').map((img) => img.getText());
    const index = elementTitle.findIndex((currenTitle) => currenTitle === value);
    const item = await rows[index];
    await item.click();
  },
);
global.fieldRegistry.register(
  'nuxeo-date',
  async (element) => {
    const dateEle = await element.element('#datetime');
    const date = moment(dateEle.getText(), global.dateFormat).format(global.dateFormat);
    return date;
  },
  () => {
    throw new Error('cannot set value of a nuxeo-date element');
  },
);
global.fieldRegistry.register(
  'nuxeo-date-picker',
  (element) => moment(element.$('vaadin-date-picker input').getValue(), global.dateFormat).format(global.dateFormat),
  async (element, value) => {
    const date = await element.$('vaadin-date-picker input');
    if (await date.getValue()) {
      const ele = await date.$('div[part="clear-button"]');
      await ele.click();
    }
    await date.click();
    const keys = await moment(value, global.dateFormat).format('L');
    await driver.keys(keys);
    await driver.keys('Enter');
  },
);
global.fieldRegistry.register(
  'nuxeo-textarea',
  (element) => element.element('#textarea').getValue(),
  async (element, value) => {
    const ele = await element.$('#textarea');
    await ele.setValue(value);
  },
);
global.fieldRegistry.register('nuxeo-user-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-directory-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-document-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-dropdown-aggregation', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-selectivity', suggestionGet, suggestionSet);
global.fieldRegistry.register(
  'nuxeo-select2',
  (element) => element.$('div ul li input').getValue(),
  (element, value) => {
    element.$('div ul li input').click();
    driver.$('div ul li input').setValue(value);
    $(`//div[text()='${value}' and @class='select2-result-label']`).waitForVisible();
    driver.$(`//div[text()='${value}' and @class='select2-result-label']`).click();
  },
);
global.fieldRegistry.register('nuxeo-tag-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register(
  'paper-input',
  (element) => element.$('.input-element input').getValue(),
  (element, value) => {
    element.$('.input-element input').setValue(value);
  },
);
global.fieldRegistry.register(
  'paper-radio-button',
  (element) => element.$('#radioContainer').getAttribute('multiple') !== null,
  async (element, value) => {
    if (value) {
      const setEle = await element.element('#radioContainer');
      await setEle.click();
    }
  },
);
global.fieldRegistry.register(
  'paper-textarea',
  (element) => element.$('#textarea').getValue(),
  (element, value) => {
    element.$('#textarea').setValue(value);
  },
);
global.fieldRegistry.register(
  'paper-checkbox',
  (element) => element.getAttribute('checked') !== null,
  async (element, value) => {
    const ele = await element.getAttribute('checked');
    if (
      ((value === false || value === 'false') && ele !== null) ||
      ((value === true || value === 'true') && ele === null)
    ) {
      await element.scrollIntoView();
      await element.click();
    }
  },
);
global.fieldRegistry.register(
  'nuxeo-checkbox-aggregation',
  (element) => {
    let el = element;
    if (el.getAttribute('collapsible') !== null) {
      el = el.$('iron-collapse');
    }
    return el.$('paper-checkbox').getAttribute('aria-checked') !== null;
  },
  async (element, value) => {
    let el = element;
    await el.waitForVisible();
    if ((await el.getAttribute('collapsible')) !== null) {
      el = await el.element('iron-collapse');
      const button = await element.$('button');
      await button.waitForVisible();
      await button.click();
    }
    const paperCheckbox = await el.$('paper-checkbox');
    await paperCheckbox.waitForVisible();
    const els = await el.$$('paper-checkbox');
    const checkbox = await els.find(async (e) => {
      const text = await e.getText();
      return typeof text === 'string' && text.trim().includes(value);
    });
    await checkbox.click();
  },
);
global.fieldRegistry.register(
  'nuxeo-dropzone',
  async (element) => element.$("input[id='input']").getValue(),
  async (element, value) => {
    await element.waitForExist("input[id='input']");
    element.chooseFile("input[id='input']", path.resolve(fixtures.blobs.get(value)));
  },
);
global.fieldRegistry.register(
  'nuxeo-data-table',
  (element) => {
    element.scrollIntoView();
    const result = [];
    element.$$('nuxeo-data-table-row:not([header])').forEach((row) => {
      const cellValue = [];
      row.$$('nuxeo-data-table-cell:not([header])').forEach((cell) => {
        const txt = cell.getText();
        if (txt) {
          cellValue.push(txt);
        }
      });
      result.push(cellValue);
    });
    return JSON.stringify(result);
  },
  async (element, values) => {
    await element.scrollIntoView();
    const jValues = JSON.parse(values);
    for (let index = 0; index < jValues.length; index++) {
      const value = jValues[index];
      const addEntryEle = await element.element('#addEntry');
      await addEntryEle.click();
      const dialog = await element.element('nuxeo-dialog[id="dialog"]:not([aria-hidden])');
      await dialog.waitForVisible();
      const form = await element.element('#editForm');
      await form.waitForVisible();
      const objKeys = Object.keys(value);
      for (let ind = 0; ind < objKeys.length; ind++) {
        const property = objKeys[ind];
        await form.waitForVisible(`[name="${property}"]`);
        const formEle = await form.element(`[name="${property}"]`);
        await fixtures.layouts.setValue(formEle, value[property]);
      }
      await dialog.waitForVisible('paper-button[id="save"]');
      await dialog.$('paper-button[id="save"]').click();
    }
  },
);
global.fieldRegistry.register('nuxeo-document-blob', (element) => {
  element.scrollIntoView();
  return element.$('a').getAttribute('title');
});
global.fieldRegistry.register(
  'generic',
  (element) => element.getText(),
  async (element, value) => {
    await element.setValue(value);
  },
);

fixtures.layouts = {
  getValue: async (element) => {
    const fieldType = await element.getTagName();
    return (global.fieldRegistry.contains(fieldType)
      ? await global.fieldRegistry.getValFunc(fieldType)
      : global.fieldRegistry.getValFunc('generic'))(element);
  },
  setValue: async (element, value) => {
    const fieldType = await element.getTagName();
    await (global.fieldRegistry.contains(fieldType)
      ? global.fieldRegistry.setValFunc(fieldType)
      : global.fieldRegistry.setValFunc('generic'))(element, value);
  },
  page: {
    Note: 'nuxeo-document-page',
    File: 'nuxeo-document-page',
    Picture: 'nuxeo-picture-document-page',
    Video: 'nuxeo-document-page',
    Folder: 'nuxeo-collapsible-document-page',
    Workspace: 'nuxeo-collapsible-document-page',
    Collection: 'nuxeo-collapsible-document-page',
    GridFile: 'nuxeo-gridfile-document-page',
  },
};
