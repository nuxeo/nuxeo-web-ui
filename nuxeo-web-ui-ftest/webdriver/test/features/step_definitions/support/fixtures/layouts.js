import { FieldRegistry } from '../services/field_registry';

global.fieldRegistry = new FieldRegistry();
global.fieldRegistry.register('paper-input',
                              (element) => element.element('#input').getValue(),
                              (element, value) => { element.element('#input').setValue(value); });
global.fieldRegistry.register('paper-textarea',
                              (element) => element.element('#textarea').getValue(),
                              (element, value) => { element.element('#textarea').setValue(value); });
global.fieldRegistry.register('generic',
                              (element) => element.getValue(),
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
