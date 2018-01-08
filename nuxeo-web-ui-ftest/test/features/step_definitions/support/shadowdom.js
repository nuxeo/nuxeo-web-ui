/**
 * Wraps WDIO with methods to pierce Shadow Dom.
 * XXX: should be able to override commands with addCommand once this is fixed:
 * https://github.com/webdriverio/webdriverio/issues/1539
 */

function shadowSelector(selector) {
  return (selector && !selector.includes(`//`)) ? `* >>> ${selector.trim().replace(/\s+/g, ' >>> ')}` : selector;
}

function formatParameters(args) {
  const parameters = [].concat(args);
  if (parameters.length > 0 && typeof parameters[0] === 'string') {
    parameters[0] = shadowSelector(parameters[0]);
  }
  return parameters;
}

function getMethods(obj) {
  let props = [];
  let o = obj;
  do { // eslint-disable-line no-cond-assign
    props = props.concat(Object.getOwnPropertyNames(o));
  } while (o = Object.getPrototypeOf(o));

  return props.sort().filter((e, i, arr) => {
    if (e !== arr[i + 1] && typeof obj[e] === 'function') {
      return true;
    }
  });
}

class ShadowElement {
  constructor(element) {
    this.__element = element;
    if (this.__element.ELEMENT) {
      this.ELEMENT = this.__element.ELEMENT;
    }
    if (this.__element.value) {
      this.value = this.__element.value;
      if (Array.isArray(this.value)) {
        for (let i = 0; i < this.value.length; i++) {
          if (this.value[i].ELEMENT) {
            this.value[i] = wrapShadow(this.value[i], true); // eslint-disable-line no-use-before-define
          }
        }
      } else if (this.value.ELEMENT) {
        this.value = wrapShadow(this.value, true); // eslint-disable-line no-use-before-define
      }
    }
    getMethods(this.__element).forEach((property) => {
      this[property] = this.__element[property].bind(this.__element);
    });
  }
}

function wrapShadow(element, isWebElement) {
  const el = isWebElement ? new ShadowElement(element) : element;
  el._element = el.element;
  el.element = (...args) => wrapShadow(el._element.apply(el, formatParameters(args)), true);

  el._elements = el.elements;
  el.elements = (...args) => wrapShadow(el._elements.apply(el, formatParameters(args)), true);

  el._isExisting = el.isExisting;
  el.isExisting = (...args) => el._isExisting.apply(el, formatParameters(args));

  el._waitForExist = el.waitForExist;
  el.waitForExist = (...args) => el._waitForExist.apply(el, formatParameters(args));

  el._isVisible = el.isVisible;
  el.isVisible = (...args) => el._isVisible.apply(el, formatParameters(args));

  el._waitForVisible = el.waitForVisible;
  el.waitForVisible = (...args) => el._waitForVisible.apply(el, formatParameters(args));

  el._click = el.click;
  el.click = (...args) => el._click.apply(el, formatParameters(args));

  el._waitForEnabled = el.waitForEnabled;
  el.waitForEnabled = (...args) => wrapShadow(el._waitForEnabled.apply(el, formatParameters(args)), true);

  el._getText = el.getText;
  el.getText = (...args) => {
    const parameters = [].concat(args);
    const selector = parameters.length > 0 ? parameters.shift() : undefined;
    if (selector) {
      return el.element(selector).getText();
    } else {
      return el._getText.apply(el, parameters);
    }
  };

  el._chooseFile = el.chooseFile;
  el.chooseFile = (...args) => el._chooseFile.apply(el, formatParameters(args));

  el._elementByTextContent = (selector, textContent) => {
    const els = el.elements(selector).value;
    return els.find((e) => {
      const text = e.getText();
      return typeof text === 'string' && text.trim() === textContent;
    });
  };

  el.hasElementByTextContent = (selector, textContent) => !!el._elementByTextContent(selector, textContent);

  el.elementByTextContent = (selector, textContent) =>
    browser.waitUntil(() => el._elementByTextContent(selector, textContent),
      'No element can be found for the given selector and text content.');

  // XXX: will only work on Chrome and Firefox, and requires a selector.
  el.scrollIntoView = (selector) => {
    const sel = selector ? shadowSelector(selector) : el.selector;
    if (!sel) {
      throw new Error(`invalid selector`);
    }
    return browser.execute((s) => {
      var e = document.querySelector(s); // eslint-disable-line no-var
      e.scrollIntoView();
    }, sel);
  };

  return el;
}

wrapShadow(browser);
