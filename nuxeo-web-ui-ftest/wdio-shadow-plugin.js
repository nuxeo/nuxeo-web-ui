function findDeep(selector, multiple, baseElement, filterBy) {
  const reference = baseElement || document.documentElement;

  function findParentOrHost(element) {
    const parentNode = element.parentNode;
    if (parentNode && parentNode.host && parentNode.tagName !== 'A') {
      return parentNode.host;
    } else {
      return parentNode === reference ? null : parentNode;
    }
  }

  function collectAllElementsDeep(sel = null) {
    const allElements = [];

    const findAllElements = function (nodes) {
      for (let i = 0, el; el = nodes[i]; ++i) {
        allElements.push(el);
        // If the element has a shadow root, dig deeper.
        if (el.shadowRoot) {
          findAllElements(el.shadowRoot.querySelectorAll('*'));
        }
      }
    };
    findAllElements(reference.querySelectorAll('*'));
    if (reference.shadowRoot) {
      findAllElements(reference.shadowRoot.querySelectorAll('*'));
    }
    return sel ? allElements.filter(el => el.matches(sel)) : allElements;
  }

  function findMatchingElement(splitSelector, possibleElementsIndex) {
    return (element) => {
      let position = possibleElementsIndex;
      let parent = element;
      let foundElement = false;
      while (parent && parent !== reference) {
        const foundMatch = parent.matches(splitSelector[position]);
        if (foundMatch && position === 0) {
          foundElement = true;
          break;
        }
        if (foundMatch) {
          position--;
        }
        parent = findParentOrHost(parent);
      }
      return foundElement;
    };
  }

  function _querySelectorDeep(sel, findMany) {
    const lightElement = reference.querySelector(sel);

    if (document.head.createShadowRoot || document.head.attachShadow) {
      // no need to do any special if selector matches something specific in light-dom
      if (!findMany && lightElement) {
        return lightElement;
      }
      // do best to support complex selectors and split the query
      const splitSelector = sel.match(/(([^\s\"']+\s*[,>+~]\s*)+|\'[^']*\'+|\"[^\"]*\"+|[^\s\"']+)+/g);

      const possibleElementsIndex = splitSelector.length - 1;
      const possibleElements = collectAllElementsDeep(splitSelector[possibleElementsIndex]);
      const findElements = findMatchingElement(splitSelector, possibleElementsIndex);
      if (findMany) {
        return possibleElements.filter(findElements);
      } else {
        return possibleElements.find(findElements);
      }
    } else {
      if (!findMany) {
        return lightElement;
      } else {
        return reference.querySelectorAll(sel);
      }
    }
  }

  function querySelectorAllDeep(sel) {
    return _querySelectorDeep(sel, true);
  }

  function querySelectorDeep(sel) {
    return _querySelectorDeep(sel);
  }

  let result;
  if (selector) {
    result = multiple ? querySelectorAllDeep(selector) : querySelectorDeep(selector);
  } else {
    result = multiple ? [reference] : reference;
  }
  if (result && filterBy) {
    const filter = new Function(['element'], filterBy);
    if (Array.isArray(result)) {
      return result.filter(filter);
    } else {
      return filterBy(result) ? result : null;
    }
  } else {
    return result;
  }
}

// export init function for initialization
exports.init = function (browser) {
  if (!browser) {
    throw new Error('A WebdriverIO instance is needed to initialise wdio-webcomponents');
  }

  function noSuchElement(result) {
    return {
      status: 7,
      type: 'NoSuchElement',
      message: 'An element could not be located on the page using the given search parameters.',
      state: 'failure',
      sessionId: result.sessionId,
      value: null,
      selector: result.selector
    };
  }

  browser.addCommand('shadowElement', function (selector, multiple, filterBy) {
    if (!selector) {
      let res = Object.assign({}, this.lastResult);

      /**
       * if last result was an element result transform result into an array
       */
      if (multiple && !Array.isArray(res.value)) {
        res.value = res.value !== null ? [res.value] : [];
      } else if (!multiple && Array.isArray(res.value) && res.value.length > 0) {
        res = res.value[0];
      }

      return res;
    }
    let baseElement = this.lastResult && this.lastResult.value;
    if (Array.isArray(baseElement) && baseElement.length > 0) {
      baseElement = baseElement[0];
    }
    return this
        .execute(findDeep, selector, multiple === true, baseElement, filterBy)
        .then((result) => {
          const myResult = Object.assign({}, result, { selector });
          return (myResult.value !== null) ? myResult : noSuchElement(myResult);
        });
  });

  browser.addCommand('shadowExecute', function (arg1, arg2) {
    if (typeof arg1 === 'function') {
      const elem = this.shadowElement();
      return this.execute(arg1, elem);
    } else {
      return this
          .shadowElement(arg1)
          .then((r) => this.execute(arg2, r.value));
    }
  });

  browser.addCommand('element', function (selector) {
    return this.shadowElement(selector);
  }, true);

  browser.addCommand('elements', function (selector) {
    return this.shadowElement(selector, true);
  }, true);

  browser.addCommand('hasElementByTextContent', function (selector, textContent) {
    return !!this.shadowElement(selector, true, `return element.textContent.trim() === "${textContent.trim()}";`);
  });

  browser.addCommand('elementByTextContent', function (selector, textContent) {
    this.waitForVisible(selector);
    return this.shadowElement(selector, true, `return element.textContent.trim() === "${textContent.trim()}";`);
  });

  browser.addCommand('scrollIntoView', function (selector) {
    return this.shadowExecute(selector,
        (element) => ((Array.isArray(element) && element.length > 0) ? element[0] : element).scrollIntoView());
  });
};