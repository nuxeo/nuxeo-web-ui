import { FieldRegistry } from '../services/field_registry';
import path from 'path';

global.fieldRegistry = new FieldRegistry();
global.fieldRegistry.register('nuxeo-input',
                              (element) => element.element('#input').getValue(),
                              (element, value) => { element.element('#input').setValue(value); });
global.fieldRegistry.register('nuxeo-select',
                              (element) => {
                                element.element('#input').getValue();
                              },
                              (element, value) => {
                                element.element('#input').click();
                                driver.waitForVisible(`//paper-item[text()="${value}"]`);
                                element.element(`///paper-item[text()="${value}"]`).click();
                              });
global.fieldRegistry.register('nuxeo-date-picker',
                              (element) => element.element('#input').getValue(),
                              (element, value) => {
                                element.element('#input').click();
                                const keys = value.split('-');
                                driver.keys(keys);
                              });
global.fieldRegistry.register('nuxeo-textarea',
                              (element) => element.element('#textarea').getValue(),
                              (element, value) => { element.element('#textarea').setValue(value); });
global.fieldRegistry.register('nuxeo-user-suggestion',
                              (element) => element.element(`#select2-drop div.select2-search input.select2-input`)
                                                  .getValue(),
                              (element, value) => {
                                element.element('nuxeo-select2 div#s2id_select2').click();
                                driver.waitForVisible(`#select2-drop div.select2-search input.select2-input`);
                                driver.element(`#select2-drop div.select2-search input.select2-input`).setValue(value);
                                driver.waitForVisible(`#select2-drop li.select2-result`);
                                driver.element(`#select2-drop li.select2-result`).click();
                              });
global.fieldRegistry.register('nuxeo-directory-suggestion',
                              (element) => {
                                if (element.getAttribute('multiple')) {
                                  let multiple = '';
                                  let i;
                                  for (i = 1; i < element
                                      .elements('#s2id_select2 ul li.select2-search-choice').value.length; i++) {
                                    multiple += `${element.element(`#s2id_select2 ul
                                                 li.select2-search-choice:nth-child(${i}) div`).getText()},`;
                                  }
                                  multiple += element.element(`#s2id_select2 ul
                                              li.select2-search-choice:nth-child(${i}) div`).getText();
                                  return multiple;
                                } else {
                                  return element.element('#select2').getValue();
                                }
                              },
                              (element, value) => {
                                if (element.getAttribute('multiple')) {
                                  const values = value.split(',');
                                  for (let i = 0; i < values.length; i++) {
                                    element.element('nuxeo-select2 div#s2id_select2').click();
                                    driver.waitForVisible(`input.select2-focused`);
                                    driver.element(`input.select2-focused`).setValue(values[i]);
                                    driver.waitForVisible(`#select2-drop li.select2-result`);
                                    driver.element(`#select2-drop li.select2-result`).click();
                                  }
                                } else {
                                  element.element('nuxeo-select2 a.select2-choice').click();
                                  driver.waitForVisible(`#select2-drop .select2-search input`);
                                  driver.element(`#select2-drop .select2-search input`).setValue(value);
                                  driver.waitForVisible(`#select2-drop li.select2-result`);
                                  driver.element(`#select2-drop li.select2-result`).click();
                                }
                              });
global.fieldRegistry.register('nuxeo-dropdown-aggregation',
                              (element) => element.element('nuxeo-select2 input').getValue(),
                              (element, value) => {
                                element.element('nuxeo-select2 input').click();
                                driver.element('nuxeo-select2 input').setValue(value);
                                driver.waitForVisible(`#select2-drop li.select2-result`);
                                driver.element(`#select2-drop li.select2-result`).click();
                              });
global.fieldRegistry.register('nuxeo-select2',
                              (element) => element.element('div ul li input').getValue(),
                              (element, value) => {
                                element.element('div ul li input').click();
                                driver.element('div ul li input').setValue(value);
                                driver.waitForVisible(`//div[text()='${value}' and @class='select2-result-label']`);
                                driver.element(`//div[text()='${value}' and @class='select2-result-label']`).click();
                              });
global.fieldRegistry.register('nuxeo-tag-suggestion',
                              (element) => element.element('nuxeo-tag-suggestion nuxeo-select2 div ul li input')
                                                  .getValue(),
                              (element, value) => {
                                element.element('nuxeo-tag-suggestion nuxeo-select2 div ul li input').click();
                                driver.element('nuxeo-tag-suggestion nuxeo-select2 div ul li input').setValue(value);
                                driver.waitForVisible(`//div[@class='select2-result-label']/span[text()='${value}']`);
                                driver.element(`//div[@class='select2-result-label']/span[text()='${value}']`).click();
                              });
global.fieldRegistry.register('paper-input',
                              (element) => element.element('#input').getValue(),
                              (element, value) => { element.element('#input').setValue(value); });
global.fieldRegistry.register('paper-radio-button',
                              (element) => element.element('#radioContainer').getAttribute('multiple'),
                              (element, value) => {
                                if (value) {
                                  element.element('#radioContainer').click();
                                }
                              });
global.fieldRegistry.register('paper-checkbox',
                              (element) => element.getAttribute('checked'),
                              (element, value) => {
                                if ((value === false && element.getAttribute('checked') === 'true') ||
                                  (value === true && element.getAttribute('checked') === 'null')) {
                                  element.click();
                                }
                              });
global.fieldRegistry.register('nuxeo-checkbox-aggregation',
                              (element) => element.element(
                                  `///div[@id='checkboxLabel']/parent::paper-checkbox`
                                ).getAttribute('aria-checked'),
                              (element, value) => {
                                driver.waitForVisible(`//div[@id='checkboxLabel' and contains(., '${value}')]`);
                                element.element(`///div[@id='checkboxLabel' and contains(., '${value}')]`).click();
                              });
global.fieldRegistry.register('nuxeo-dropzone',
                              (element) => element.element(`///input[@id='input']`).getValue(),
                              (element, value) => {
                                element.waitForExist(`///input[@id='input']`);
                                browser.chooseFile(`//nuxeo-dropzone/input[@id='input']`,
                                                   path.resolve(fixtures.blobs.get(value)));
                              });
global.fieldRegistry.register('generic',
                              (element) => element.getText(),
                              (element, value) => element.setValue(value));

fixtures.layouts = {
  getValue: (element) => {
    const fieldType = element.getTagName();
    return (global.fieldRegistry.contains(fieldType) ? global.fieldRegistry.getValFunc(fieldType) :
                                                       global.fieldRegistry.getValFunc('generic'))(element);
  },
  setValue: (element, value) => {
    const fieldType = element.getTagName();
    (global.fieldRegistry.contains(fieldType) ? global.fieldRegistry.setValFunc(fieldType) :
                                                global.fieldRegistry.setValFunc('generic'))(element, value);
  },
};
