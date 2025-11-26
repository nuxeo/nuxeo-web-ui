const _flushProperties = () => {
  driver.execute((conf) => {
    conf.forEach(({ key, value }) => Nuxeo.UI.config.set(key, value));
    document.dispatchEvent(new CustomEvent('automation-ready'));
  }, global.config || []);
};

const refresh = async () => {
  await driver.refresh();
  await waitForNuxeo();
  await _flushProperties();
};

const url = async (...args) => {
  await driver.url(...args);
  await waitForNuxeo();
  _flushProperties();
};

const waitForNuxeo = async () => {
  await driver.waitUntil(
    async () => {
      const url = await driver.getUrl();

      // Only check Nuxeo after UI is loading
      console.log("URL : ", url);
      if (!url.includes('/ui')) {
        return false;
      }

      // Ensure Nuxeo and UI.config exist
      return await driver.execute(() => {
        return window.Nuxeo 
            && window.Nuxeo.UI 
            && window.Nuxeo.UI.config;
      });
    },
    {
      timeout: 60000,
      interval: 300,
      timeoutMsg: 'window.Nuxeo.UI.config did not appear',
    }
  );
};

const clickActionMenu = async (menu, selector) => {
  await menu.waitForExist(selector);
  const action = await menu.$(selector);
  await action.waitForExist();
  if ((await action.getAttribute('show-label')) !== null) {
    // if the element is inside the dropdown, we need to expand it
    const myButton = await menu.$('#dropdownButton');
    await myButton.click();
    await menu.waitForVisible('paper-listbox');
    await menu.waitForVisible('[slot="dropdown"] .label');
    await menu.waitForEnabled('[slot="dropdown"] .label');
  }
  const myClass = await action.$('.action');
  await myClass.waitForVisible();
  await myClass.waitForEnabled();
  await myClass.click();
};

export { clickActionMenu, refresh, url };
