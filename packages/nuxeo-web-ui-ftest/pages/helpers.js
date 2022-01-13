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

const url = (...args) => {
  driver.url(...args);
  _flushProperties();
};

const clickActionMenu = (menu, selector) => {
  menu.waitForExist(selector);
  const action = menu.element(selector);
  action.waitForExist();
  if (action.getAttribute('show-label') !== null) {
    // if the element is inside the dropdown, we need to expand it
    menu.click('#dropdownButton');
    menu.waitForVisible('paper-listbox');
    menu.waitForVisible('[slot="dropdown"] .label');
    menu.waitForEnabled('[slot="dropdown"] .label');
  }
  action.waitForVisible('.action');
  action.waitForEnabled('.action');
  // let's make sure we're clicking on the div the has the click event handler
  action.click('.action');
};

export { clickActionMenu, refresh, url };
