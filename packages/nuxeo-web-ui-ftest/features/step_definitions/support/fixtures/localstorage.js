import { After } from '@cucumber/cucumber';

/* global document, localStorage  */
// cleans up local storage fo the current user
After({ tags: '@cleanupLocalStorage' }, () =>
  browser.execute(() => {
    const username = document.querySelector('nuxeo-app').currentUser.id;
    Object.keys(localStorage).forEach((storage) => {
      if (storage.startsWith(`${username}-`)) {
        localStorage.removeItem(storage);
      }
    });
  }),
);
