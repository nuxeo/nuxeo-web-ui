import { FieldRegistry } from '../services/field_registry';

global.fieldRegistry = new FieldRegistry();
global.fieldRegistry.register('nuxeo-input',
                              (element) => element.element('#input').getValue(),
                              (element, value) => { element.element('#input').setValue(value); });
global.fieldRegistry.register('nuxeo-textarea',
                              (element) => element.element('#textarea').getValue(),
                              (element, value) => { element.element('#textarea').setValue(value); });
global.fieldRegistry.register('nuxeo-directory-suggestion',
                              (element) => {
                                if (element.getAttribute('multiple')) {
                                  var multiple = [];
                                  for (var i = 1; i < element.elements('#s2id_select2 ul li.select2-search-choice').value.length + 1; i++) {
                                    multiple.push(element.element('#s2id_select2 ul li.select2-search-choice:nth-child(' + i + ') div').getText());
                                  }
                                  return multiple;
                                } else {
                                  element.element('#select2').getValue()
                                }
                              },
                              (element, value) => {
                                if (element.getAttribute('multiple')) {
                                  element.element('nuxeo-select2 div#s2id_select2').click();
                                  driver.waitForVisible(`input.select2-focused`);
                                  driver.element(`input.select2-focused`).setValue(value);
                                  driver.waitForVisible(`#select2-drop li.select2-result`);
                                  driver.element(`#select2-drop li.select2-result`).click();
                                } else {
                                  element.element('nuxeo-select2 a.select2-choice').click();
                                  driver.waitForVisible(`#select2-drop .select2-search input`);
                                  driver.element(`#select2-drop .select2-search input`).setValue(value);
                                  driver.waitForVisible(`#select2-drop li.select2-result`);
                                  driver.element(`#select2-drop li.select2-result`).click();
                                }
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
