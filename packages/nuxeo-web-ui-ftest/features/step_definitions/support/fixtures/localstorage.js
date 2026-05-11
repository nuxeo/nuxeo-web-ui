import { After } from '@cucumber/cucumber';

/* global document, localStorage  */
// cleans up local storage fo the current user
After({ tags: '@cleanupLocalStorage' }, () =>
  browser.execute(() => {
    const app = document.querySelector('nuxeo-app');
    if (!app || !app.currentUser) return;
    const username = app.currentUser.id;
    Object.keys(localStorage).forEach((storage) => {
      if (storage.startsWith(`${username}-`)) {
        localStorage.removeItem(storage);
      }
    });
  }),
);
