module.exports = function () {
  this.After({ tags: ['@cleanupLocalStorage'] }, () => {
    // cleans up local storage fo the current user
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
