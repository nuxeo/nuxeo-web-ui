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
          await dropdown.element('.selectivity-result-item').waitForVisible();
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
  else if (element.getAttribute('multiple') !== null) {
    element
      .elements('.selectivity-multiple-selected-item')
      .forEach((el) => el.element('.selectivity-multiple-selected-item-remove').click());
  } else {
    const item = element.element('.selectivity-single-selected-item');
    if (item) {
      item.element('.selectivity-single-selected-item-remove').click();
    }
  }
};
global.fieldRegistry.register(
  'nuxeo-input',
  (element) => element.element('.input-element input').getValue(),
  (element, value) => {
    element.element('.input-element input').setValue(value);
  },
);
global.fieldRegistry.register(
  'nuxeo-select',
  (element) => {
    element.element('.input-element input').getValue();
  },
  (element, value) => {
    element.element('.input-element input').click();
    element.waitForExist('paper-item');
    const item = element.elements('paper-item').find((e) => e.getText() === value);
    item.click();
  },
);
global.fieldRegistry.register(
  'nuxeo-date',
  (element) => {
    const date = moment(element.element('#datetime').getText(), global.dateFormat).format(global.dateFormat);
    return date;
  },
  () => {
    throw new Error('cannot set value of a nuxeo-date element');
  },
);
global.fieldRegistry.register(
  'nuxeo-date-picker',
  (element) =>
    moment(element.element('vaadin-date-picker input').getValue(), global.dateFormat).format(global.dateFormat),
  (element, value) => {
    const date = element.element('vaadin-date-picker input');
    if (date.getValue()) {
      date.element('div[part="clear-button"]').click();
    }
    date.click();
    const keys = moment(value, global.dateFormat).format('L');
    driver.keys(keys);
    driver.keys('Enter');
  },
);
global.fieldRegistry.register(
  'nuxeo-textarea',
  (element) => element.element('#textarea').getValue(),
  (element, value) => {
    element.element('#textarea').setValue(value);
  },
);
global.fieldRegistry.register('nuxeo-user-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-directory-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-document-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-dropdown-aggregation', suggestionGet, suggestionSet);
global.fieldRegistry.register('nuxeo-selectivity', suggestionGet, suggestionSet);
global.fieldRegistry.register(
  'nuxeo-select2',
  (element) => element.element('div ul li input').getValue(),
  (element, value) => {
    element.element('div ul li input').click();
    driver.element('div ul li input').setValue(value);
    $(`//div[text()='${value}' and @class='select2-result-label']`).waitForVisible();
    driver.element(`//div[text()='${value}' and @class='select2-result-label']`).click();
  },
);
global.fieldRegistry.register('nuxeo-tag-suggestion', suggestionGet, suggestionSet);
global.fieldRegistry.register(
  'paper-input',
  (element) => element.element('.input-element input').getValue(),
  (element, value) => {
    element.element('.input-element input').setValue(value);
  },
);
global.fieldRegistry.register(
  'paper-radio-button',
  (element) => element.element('#radioContainer').getAttribute('multiple') !== null,
  (element, value) => {
    if (value) {
      element.element('#radioContainer').click();
    }
  },
);
global.fieldRegistry.register(
  'paper-textarea',
  (element) => element.element('#textarea').getValue(),
  async (element, value) => {
    const elementInput = await element.element('#textarea');
    await elementInput.setValue(value);
  },
);
global.fieldRegistry.register(
  'paper-checkbox',
  (element) => element.getAttribute('checked') !== null,
  (element, value) => {
    if (
      ((value === false || value === 'false') && element.getAttribute('checked') !== null) ||
      ((value === true || value === 'true') && element.getAttribute('checked') === null)
    ) {
      element.scrollIntoView();
      element.click();
    }
  },
);
global.fieldRegistry.register(
  'nuxeo-checkbox-aggregation',
  (element) => {
    let el = element;
    if (el.getAttribute('collapsible') !== null) {
      el = el.element('iron-collapse');
    }
    return el.element('paper-checkbox').getAttribute('aria-checked') !== null;
  },
  (element, value) => {
    let el = element;
    el.waitForVisible();
    if (el.getAttribute('collapsible') !== null) {
      el = el.element('iron-collapse');
      const button = element.element('button');
      button.waitForVisible();
      button.click();
    }
    el.waitForVisible('paper-checkbox');
    const els = el.elements('paper-checkbox');
    const checkbox = els.find((e) => {
      const text = e.getText();
      return typeof text === 'string' && text.trim().includes(value);
    });
    checkbox.click();
  },
);
global.fieldRegistry.register(
  'nuxeo-dropzone',
  (element) => element.element("input[id='input']").getValue(),
  (element, value) => {
    element.waitForExist("input[id='input']");
    element.chooseFile("input[id='input']", path.resolve(fixtures.blobs.get(value)));
  },
);
global.fieldRegistry.register(
  'nuxeo-data-table',
  (element) => {
    element.scrollIntoView();
    const result = [];
    element.elements('nuxeo-data-table-row:not([header])').forEach((row) => {
      const cellValue = [];
      row.elements('nuxeo-data-table-cell:not([header])').forEach((cell) => {
        const txt = cell.getText();
        if (txt) {
          cellValue.push(txt);
        }
      });
      result.push(cellValue);
    });
    return JSON.stringify(result);
  },
  (element, values) => {
    element.scrollIntoView();
    const jValues = JSON.parse(values);
    jValues.forEach((value) => {
      element.element('#addEntry').click();
      const dialog = element.element('nuxeo-dialog[id="dialog"]:not([aria-hidden])');
      dialog.waitForVisible();
      const form = element.element('#editForm');
      form.waitForVisible();
      Object.keys(value).forEach((property) => {
        form.waitForVisible(`[name="${property}"]`);
        fixtures.layouts.setValue(form.element(`[name="${property}"]`), value[property]);
      });
      dialog.waitForVisible('paper-button[id="save"]');
      dialog.click('paper-button[id="save"]');
    });
  },
);
global.fieldRegistry.register('nuxeo-document-blob', (element) => {
  element.scrollIntoView();
  return element.element('a').getAttribute('title');
});
global.fieldRegistry.register(
  'generic',
  (element) => element.getText(),
  (element, value) => element.setValue(value),
);

fixtures.layouts = {
  getValue: async (element) => {
    const fieldType = await element.getTagName();
    return (global.fieldRegistry.contains(fieldType)
      ? global.fieldRegistry.getValFunc(fieldType)
      : global.fieldRegistry.getValFunc('generic'))(element);
  },
  setValue: async (element, value) => {
    const fieldType = await element.getTagName();
    const globalfieldType = global.fieldRegistry;
    await (globalfieldType.contains(fieldType)
      ? globalfieldType.setValFunc(fieldType)
      : globalfieldType.setValFunc('generic'))(element, value);
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
