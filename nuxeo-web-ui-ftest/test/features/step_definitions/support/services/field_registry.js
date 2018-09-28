export default class FieldRegistry {
  constructor() {
    this._registry = {};
  }

  contains(fieldType) {
    return fieldType in this._registry;
  }

  getValFunc(fieldType) {
    return this._registry[fieldType].getValue;
  }

  setValFunc(fieldType) {
    return this._registry[fieldType].setValue;
  }

  register(fieldType, getValFunc, setValFunc) {
    this._registry[fieldType] = {
      getValue: getValFunc,
      setValue: setValFunc,
    };
  }

  unregister(fieldType) {
    delete this._registry[fieldType];
  }
}
