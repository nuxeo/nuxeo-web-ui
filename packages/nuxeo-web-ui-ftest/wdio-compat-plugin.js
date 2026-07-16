export default class {
  static get name() {
    return 'CompatV4';
  }

  before() {
    if (!browser) {
      throw new Error('A WebdriverIO instance is needed to initialise wdio-webcomponents');
    }

    // Add commands to the browser scope.
    browser.addCommand('alertAccept', async function () {
      await this.waitUntil(
        async () => {
          try {
            await this.acceptAlert();
            return true;
          } catch (e) {
            return false;
          }
        },
        {
          timeout: 10000,
          interval: 500,
          timeoutMsg: 'Expected confirmation alert did not appear',
        },
      );
    });

    browser.addCommand('alertDismiss', async function () {
      return this.dismissAlert();
    });

    browser.addCommand('alertText', async function () {
      return this.getAlertText();
    });

    browser.addCommand('click', async function (selector) {
      const element = await this.$(selector);
      return element.click();
    });

    browser.addCommand('element', async function (selector) {
      return this.$(selector);
    });

    browser.addCommand('elements', async function (selector) {
      const res = this.$$(selector);
      // XXX keep compat with v4 format
      if (!res.value) {
        res.value = res;
      }
      return res;
    });

    browser.addCommand('getAttribute', async function (selector, attributeName) {
      const element = await this.$(selector);
      return element.getAttribute(attributeName);
    });

    /**
     * The getCookie param was a string in v4. Reason for not changing to array.
     * Also if a name parameter is not passed an array of cookies will be returned,
     * otherwise the cookie object is returned. If not found then the return obj will be undefined.
     */
    browser.addCommand('getCookie', async function (name) {
      if (name === undefined) {
        return this.getCookies();
      }
      const cookie = await this.getCookies(name);
      return cookie[0];
    });

    browser.addCommand('getCssProperty', async function (selector, propertyName) {
      const element = await this.$(selector);
      return element.getCSSProperty(propertyName);
    });

    browser.addCommand('getSource', async function () {
      return this.getPageSource();
    });

    // In V4 dimension with choices width|height were valid, V5 getWindowSize ignores any function parameters.
    // Adding for backwards compatability.
    browser.addCommand('getViewportSize', async function (dimension = '') {
      if (dimension.toLowerCase() === 'width' || dimension.toLowerCase() === 'height') {
        return this.getWindowSize()[dimension];
      }
      return this.getWindowSize();
    });

    browser.addCommand('isExisting', async function (selector) {
      const element = await this.$(selector);
      return element.isExisting();
    });

    browser.addCommand('isVisible', async function (selector) {
      const element = await this.$(selector);
      return element.isDisplayed();
    });

    browser.addCommand('moveToObject', async function (selector, x = undefined, y = undefined) {
      const element = await this.$(selector);
      return element.moveTo(x, y);
    });

    browser.addCommand('reload', async function () {
      return this.reloadSession();
    });

    browser.addCommand('screenshot', async function () {
      return this.takeScreenshot();
    });
    browser.addCommand('scroll', async function () {
      return this.scrollIntoView();
    });

    browser.addCommand('setCookie', async function (cookieObj) {
      return this.setCookies(cookieObj);
    });

    browser.addCommand('setValue', async function (selector, value) {
      const element = await this.$(selector);
      return element.setValue(value);
    });

    /**
     * In v4 the param is an object, in v5 width and height is passed.
     * Keeping as an object for backwards compatability.
     *
     * REF: https://github.com/webdriverio-boneyard/v4/blob/master/lib/commands/setViewportSize.js
     */
    browser.addCommand('setViewportSize', async function (widthHeightObject) {
      const { width, height } = widthHeightObject;
      return this.setWindowSize(width, height);
    });

    /* Same as getSource. */
    browser.addCommand('source', async function () {
      return this.getPageSource();
    });

    browser.addCommand('switchTab', async function (windowHandle) {
      return this.switchToWindow(windowHandle);
    });

    browser.addCommand('title', async function () {
      return this.getTitle();
    });

    browser.addCommand('waitForExist', async function (selector, timeout, reverse = false) {
      const element = await this.$(selector);
      return element.waitForExist({ timeout, reverse });
    });

    browser.addCommand('windowHandles', async function () {
      return this.getWindowHandles();
    });

    browser.addCommand('windowHandleFullscreen', async function () {
      return this.fullscreenwindow();
    });

    browser.addCommand('windowHandleMaximize', async function () {
      return this.maximizeWindow();
    });

    browser.addCommand('waitForVisible', async function (selector, timeout, reverse = false) {
      const element = await this.$(selector);
      return element.waitForDisplayed({ timeout, reverse });
    });

    browser.addCommand('waitForShadowDeep', async (selectorChain, timeout = 5000) => {
      let current = await $(selectorChain[0]);
      for (let i = 1; i < selectorChain.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await browser.waitUntil(
          // eslint-disable-next-line no-loop-func
          async () => {
            try {
              current = await current.shadow$(selectorChain[i]);
              return await current.isExisting();
            } catch (e) {
              return false;
            }
          },
          {
            timeout,
            timeoutMsg: `Failed to find ${selectorChain[i]} in shadow DOM`,
          },
        );
      }

      return current;
    });

    // Add commands to the element scope.
    browser.addCommand(
      'element',
      async function (selector) {
        return this.$(selector);
      },
      true,
    );

    browser.addCommand(
      'elements',
      async function (selector) {
        const res = this.$$(selector);
        // XXX keep compat with v4 format
        if (!res.value) {
          res.value = res;
        }
        return res;
      },
      true,
    );

    browser.addCommand(
      'isVisible',
      async function (selector) {
        const target = selector ? this.$(selector) : this;
        return target.isExisting() && target.isDisplayed();
      },
      true,
    );

    browser.addCommand(
      'getCssProperty',
      async function (cssProperty) {
        return this.getCSSProperty(cssProperty);
      },
      true,
    );

    browser.addCommand(
      'clearElement',
      async function () {
        return this.clearValue();
      },
      true,
    );

    browser.addCommand(
      'moveToObject',
      async function (x = undefined, y = undefined) {
        return this.moveTo(x, y);
      },
      true,
    );

    browser.addCommand(
      'selectByValue',
      async function (optionText) {
        return this.selectByVisibleText(optionText);
      },
      true,
    );

    browser.addCommand(
      'waitForVisible',
      async function (...args) {
        let target = this;
        if (typeof args[0] === 'string' && typeof target.waitForDisplayed !== 'function') {
          const argShift = args.shift();
          target = await this.element(argShift);
        }
        const [timeout, reverse = false] = args;
        if (typeof target.waitForDisplayed === 'function') {
          return target.waitForDisplayed({ timeout, reverse });
        }
      },
      true,
    );

    browser.addCommand(
      'chooseFile',
      async function (...args) {
        let target = this;
        if (args.length > 1) {
          const argShift = args.shift();
          target = await this.element(argShift);
        }
        const [localFilePath] = args;
        const remoteFile = await browser.uploadFile(localFilePath);
        target.addValue(remoteFile);
      },
      true,
    );

    browser.addCommand(
      'hasElementByTextContent',
      async function (selector, textContent) {
        const ele = await this.elements(selector);
        return ele.some((e) => e.getText() === textContent);
      },
      true,
    );
    // overwrite element comands that previously took a selector as optional argument
    browser.overwriteCommand(
      'getText',
      async function (cmd, selector) {
        return selector ? cmd.call(this.element(selector)) : cmd();
      },
      true,
    );

    // Recover from "element click intercepted" without altering the happy path. On newer Chrome,
    // Nuxeo's sticky app header/footer and dialog overlays intercept clicks that the older pinned
    // build handled. A plain classic click is attempted first (so normal clicks and native confirm
    // dialogs behave exactly as before); only when it reports interception do we centre the element
    // and retry, then fall back to a DOM click that dispatches through the intercepting layer.
    // Native-confirm clicks succeed on the first classic attempt and never reach this recovery, so
    // alertAccept/alertDismiss handling is unaffected. Not pre-scrolling on the happy path avoids
    // disturbing virtual-list (nuxeo-data-table) scroll state.
    const isInterceptError = (e) => /click intercepted|not clickable/i.test((e && e.message) || '');
    browser.overwriteCommand(
      'click',
      async function (cmd, selector) {
        const target = selector ? await this.element(selector) : this;
        try {
          return await cmd.call(target);
        } catch (e) {
          if (!isInterceptError(e)) {
            throw e;
          }
          try {
            await target.scrollIntoView({ block: 'center', inline: 'center' });
          } catch (scrollErr) {
            // best-effort centring
          }
          try {
            return await cmd.call(target);
          } catch (e2) {
            if (isInterceptError(e2)) {
              return browser.execute((el) => el.click(), target);
            }
            throw e2;
          }
        }
      },
      true,
    );
  }
}
