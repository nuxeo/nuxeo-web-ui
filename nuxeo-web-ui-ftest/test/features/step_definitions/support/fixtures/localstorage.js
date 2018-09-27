module.exports = function () {
  // cleans up local storage fo the current user
  this.After({ tags: ['@cleanupLocalStorage'] }, () => browser.execute(() => {
    const username = document.querySelector('nuxeo-app').currentUser.id;
    Object.keys(localStorage).forEach((storage) => {
      if (storage.startsWith(`${username}-`)) {
        localStorage.removeItem(storage);
      }
    });
  }));
};
