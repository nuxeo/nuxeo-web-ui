/**
 * XXX: should be able to override commands with addCommand once this is fixed:
 * https://github.com/webdriverio/webdriverio/issues/1539
 */

function shadowSelector(selector) {
  return selector && !selector.startsWith() ? `* >>> ${selector.trim().replace(/\s+/g, ' >>> ')}` : selector;
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
  el.element = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`element: ${JSON.stringify(parameters)}`);
    return wrapShadow(el._element.apply(el, parameters), true);
  };

  el._elements = el.elements;
  el.elements = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`elements: ${JSON.stringify(parameters)}`);
    return wrapShadow(el._elements.apply(el, parameters), true);
  };

  el._isExisting = el.isExisting;
  el.isExisting = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`isExisting: ${JSON.stringify(parameters)}`);
    return el._isExisting.apply(el, parameters);
  };

  el._waitForExist = el.waitForExist;
  el.waitForExist = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`waitForExist: ${JSON.stringify(parameters)}`);
    return el._waitForExist.apply(el, parameters);
  };

  el._isVisible = el.isVisible;
  el.isVisible = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`isVisible: ${JSON.stringify(parameters)}`);
    return el._isVisible.apply(el, parameters);
  };

  el._waitForVisible = el.waitForVisible;
  el.waitForVisible = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`waitForVisible: ${JSON.stringify(parameters)}`);
    return el._waitForVisible.apply(el, parameters);
  };

  el._click = el.click;
  el.click = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`click: ${JSON.stringify(parameters)}`);
    return el._click.apply(el, parameters);
  };

  el._waitForEnabled = el.waitForEnabled;
  el.waitForEnabled = (...args) => {
    const parameters = [].concat(args);
    if (parameters.length > 0) {
      parameters[0] = shadowSelector(parameters[0]);
    }
    // console.log(`waitForEnabled: ${JSON.stringify(parameters)}`);
    return wrapShadow(el._waitForEnabled.apply(el, parameters), true);
  };

  el._getText = el.getText;
  el.getText = (...args) => {
    const parameters = [].concat(args);
    const selector = parameters.length > 0 ? parameters.shift() : undefined;
    // console.log(`getText: ${JSON.stringify(selector)}`);
    if (selector) {
      return el.element(selector).getText();
    } else {
      return el._getText.apply(el, parameters);
    }
  };

  el.elementByTextContent = (selector, textContent) => browser.waitUntil(() => {
    const els = el.elements(selector).value;
    const result = els.find((e) => {
      const text = e.getText();
      return typeof text === 'string' && text.trim() === textContent ? e : undefined;
    });
    if (result) {
      return result;
    }
  }, 'No element can be found for the given selector and text content.');

  // XXX: will only work on Chrome and Firefox, and requires a selector.
  el.scrollIntoView = (selector) => {
    const sel = selector ? shadowSelector(selector) : el.selector;
    if (!sel) {
      throw new Error(`invalid selector`);
    }
    // console.log(`scrollIntoView: ${sel}`);
    return browser.execute((s) => {
      var e = document.querySelector(s); // eslint-disable-line no-var
      e.scrollIntoView();
    }, sel);
  };

  return el;
}

wrapShadow(browser);
