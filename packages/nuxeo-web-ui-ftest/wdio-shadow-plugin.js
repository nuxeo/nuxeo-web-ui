/* eslint-disable prefer-arrow-callback */
/**
 * Inspired by:
 * - https://github.com/diego-fernandez-santos/wdio-shadow
 * - https://www.npmjs.com/package/query-selector-shadow-dom
 */

function findDeep(selector, multiple, baseElement, filterBy) {
  const reference = baseElement || document.documentElement;

  function findParentOrHost(element) {
    const { parentNode } = element;
    if (parentNode && parentNode.host && parentNode.tagName !== 'A') {
      return parentNode.host;
    }
    return parentNode === reference ? null : parentNode;
  }

  function collectAllElementsDeep(sel = null) {
    const allElements = [];

    const findAllElements = function(nodes) {
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
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
    // cleanup any duplicates
    return Array.from(new Set(sel ? allElements.filter((el) => el.matches(sel)) : allElements));
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
      // do the best to support complex selectors and split the query
      const splitSelector = sel.match(/(([^\s"']+\s*[,>+~]\s*)+|'[^']*'+|"[^"]*"+|[^\s"']+)+/g);

      const possibleElementsIndex = splitSelector.length - 1;
      const possibleElements = collectAllElementsDeep(splitSelector[possibleElementsIndex]);
      const findElements = findMatchingElement(splitSelector, possibleElementsIndex);
      if (findMany) {
        return possibleElements.filter(findElements);
      }
      return possibleElements.find(findElements);
    }
    if (!findMany) {
      return lightElement;
    }
    return reference.querySelectorAll(sel);
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
    // eslint-disable-next-line no-new-func
    const filter = new Function(['element'], filterBy);
    if (Array.isArray(result)) {
      return result.filter(filter);
    }
    return filter(result) ? result : null;
  }
  return result;
}

function rebuildSelector(using, selector) {
  switch (using) {
    case 'id':
      return `#${selector}`;
    case 'tag name':
      return selector;
    case 'name':
      return `[name="${selector}"]`;
    default:
      return selector;
  }
}

const shadowElement = (selector, multiple, baseElement, filterBy) =>
  browser.execute(findDeep, selector, multiple === true, baseElement, filterBy);

// export init function for initialization
module.exports = class {
  static get name() {
    return 'ShadowDOM';
  }

  before() {
    if (!browser) {
      throw new Error('A WebdriverIO instance is needed to initialise wdio-webcomponents');
    }

    browser.addCommand('shadowExecute', function(arg1, arg2) {
      if (typeof arg1 === 'function') {
        const elem = this.shadowElement();
        return this.execute(arg1, elem);
      }
      return this.shadowElement(arg1).then((r) => this.execute(arg2, r.value));
    });

    browser.overwriteCommand('findElement', (origFn, using, value) => shadowElement(rebuildSelector(using, value)));

    browser.overwriteCommand('findElements', (origFn, using, value) =>
      shadowElement(rebuildSelector(using, value), true),
    );

    browser.overwriteCommand(
      'findElementFromElement',
      async (origFn, el, using, value) => shadowElement(rebuildSelector(using, value), false, { ELEMENT: el }),
      true,
    );

    browser.overwriteCommand(
      'findElementsFromElement',
      async (origFn, el, using, value) => shadowElement(rebuildSelector(using, value), true, { ELEMENT: el }),
      true,
    );

    browser.addCommand('hasElementByTextContent', function(selector, textContent) {
      return !!shadowElement(
        selector,
        true,
        undefined,
        `return element.textContent.trim() === "${textContent.trim()}";`,
      );
    });

    browser.addCommand('elementByTextContent', function(selector, textContent) {
      this.waitForVisible(selector);
      return shadowElement(
        selector,
        true,
        undefined,
        `return element.textContent.trim() === "${textContent.trim()}";`,
      )[0];
    });

    browser.addCommand(
      'elementByTextContent',
      function(selector, textContent) {
        this.waitForVisible(selector);
        return shadowElement(
          selector,
          true,
          { ELEMENT: this.elementId },
          `return element.textContent.trim() === "${textContent.trim()}";`,
        )[0];
      },
      true,
    );

    browser.addCommand('scrollIntoView', function(selector) {
      return this.shadowExecute(selector, (element) =>
        (Array.isArray(element) && element.length > 0 ? element[0] : element).scrollIntoView(),
      );
    });
  }
};
