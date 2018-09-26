module.exports = function () {
  this.After({ tags: ['@cleanupLocalStorage'] }, () => {
    browser.execute(() => {
      const username = document.querySelector('nuxeo-app').currentUser.id;
      Object.keys(localStorage).forEach((storage) => {
        if (storage.startsWith(`${username}-`)) {
          localStorage.removeItem(storage);
        }
      });
    });
  });
};
