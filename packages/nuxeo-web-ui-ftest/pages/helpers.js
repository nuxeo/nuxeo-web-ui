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

export { refresh, url };
