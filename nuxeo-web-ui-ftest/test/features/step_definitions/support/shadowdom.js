/**
 * Know issues:
 * - inability to override webdriverio commands: https://github.com/webdriverio/webdriverio/issues/1539
 * - https://github.com/webdriverio/webdriverio/issues/1588
 * - https://github.com/webdriverio/webdriverio/issues/1796
 * - https://github.com/webdriverio/webdriverio/issues/1625
 */

(function() {
  function shadowSelector(selector) {
    return selector && !selector.startsWith() ? `* >>> ${selector.trim().replace(/\s+/g, ' >>> ')}` : selector;
  }

  function wrapShadow(element, isWebElement) {
    const el = isWebElement ? new ShadowElement(element) : element;
    el._element = el.element;
    el.element = (...args) => {
      let parameters = [].concat(args);
      if (parameters.length > 0) {
        parameters[0] = shadowSelector(parameters[0]);
      }
      console.log(`element: ${JSON.stringify(parameters)}`);
      return wrapShadow(el._element.apply(el, parameters), true);
    };

    el._elements = el.elements;
    el.elements = (...args) => {
      let parameters = [].concat(args);
      if (parameters.length > 0) {
        parameters[0] = shadowSelector(parameters[0]);
      }
      console.log(`elements: ${JSON.stringify(parameters)}`);
      return wrapShadow(el._elements.apply(el, parameters), true);
    };

    el._waitForExist = el.waitForExist;
    el.waitForExist = (...args) => {
      let parameters = [].concat(args);
      if (parameters.length > 0) {
        parameters[0] = shadowSelector(parameters[0]);
      }
      console.log(`waitForExist: ${JSON.stringify(parameters)}`);
      return el._waitForExist.apply(el, parameters);
    };

    el._isVisible = el.isVisible;
    el.isVisible = (...args) => {
      let parameters = [].concat(args);
      if (parameters.length > 0) {
        parameters[0] = shadowSelector(parameters[0]);
      }
      console.log(`isVisible: ${JSON.stringify(parameters)}`);
      return el._isVisible.apply(el, parameters);
    };

    el._waitForVisible = el.waitForVisible;
    el.waitForVisible = (...args) => {
      let parameters = [].concat(args);
      if (parameters.length > 0) {
        parameters[0] = shadowSelector(parameters[0]);
      }
      console.log(`waitForVisible: ${JSON.stringify(parameters)}`);
      return el._waitForVisible.apply(el, parameters);
    };

    el._click = el.click;
    el.click = (...args) => {
      let parameters = [].concat(args);
      if (parameters.length > 0) {
        parameters[0] = shadowSelector(parameters[0]);
      }
      console.log(`click: ${JSON.stringify(parameters)}`);
      return wrapShadow(el._click.apply(el, parameters), true);
    };

    el._getText = el.getText;
    el.getText = (...args) => {
      let parameters = [].concat(args);
      let selector = parameters.length > 0 ? parameters.shift() : undefined;
      console.log(`getText: ${JSON.stringify(selector)}`);
      let target = selector ? el.element(selector) : el;
      return target._getText.apply(target, parameters);
    };

    el.elementByTextContent = (selector, textContent) => {
      console.log(`elementByTextContent: ${selector}, ${textContent}`);
      return browser.waitUntil(() => {
        const els = el.elements(selector).value;
        const result = els.find((e) => e.getText().trim() === textContent ? e : undefined);
        if (result) {
          return result;
        }
      }, 'No element can be found for the given selector and text content.');
    };
    
    return el;
  }

  function getMethods(obj) {
    let props = [];
    let o = obj;
    do {
      props = props.concat(Object.getOwnPropertyNames(obj));
    } while (o = Object.getPrototypeOf(o));

    return props.sort().filter(function(e, i, arr) {
      if (e !== arr[i+1] && typeof obj[e] === 'function') return true;
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
              this.value[i] = new ShadowElement(this.value[i]);
            }
          }
        } else if (this.value.ELEMENT) {
            this.value = new ShadowElement(this.value);
        }
      }
      getMethods(this.__element).forEach((property) => {
        this[property] = this.__element[property].bind(this.__element);
      });
    }
  }

  wrapShadow(browser);
})();