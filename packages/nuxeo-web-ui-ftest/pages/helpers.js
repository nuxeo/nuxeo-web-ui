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
  await menu.waitForExist(selector);
  const action = await menu.element(selector);
  await action.waitForExist();
  // const showLabel = await action.getAttribute('show-label');
  if ((await action.getAttribute('show-label')) !== null) {
    // if the element is inside the dropdown, we need to expand it
    await menu.click('#dropdownButton');
    await menu.waitForVisible('paper-listbox');
    await menu.waitForVisible('[slot="dropdown"] .label');
    await menu.waitForEnabled('[slot="dropdown"] .label');
  }
  await action.waitForVisible('.action');
  await action.waitForEnabled('.action');
  // let's make sure we're clicking on the div the has the click event handler
  await action.click('.action');
};

export { clickActionMenu, refresh, url };
