const _flushProperties = () => {
  driver.execute((conf) => {
    conf.forEach(({ key, value }) => Nuxeo.UI.config.set(key, value));
    document.dispatchEvent(new CustomEvent('automation-ready'));
  }, global.config || []);
};

const refresh = () => {
  driver.refresh();
  _flushProperties();
};

const url = async (...args) => {
  await driver.url(...args);
  _flushProperties();
};

const clickActionMenu = async (menu, selector) => {
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
