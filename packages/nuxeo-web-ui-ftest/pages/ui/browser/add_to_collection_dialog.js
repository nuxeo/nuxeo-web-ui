import BasePage from '../../base';

export default class AddToCollectionDialog extends BasePage {
  addToCollection(collectionName) {
    const maxRetries = 3;
    let attempt = 1;

    const tryOperation = () =>
      this.el
        .$('#nxSelect')
        .then((collectionSelect) =>
          collectionSelect
            .waitForVisible({ timeout: 10000 })
            .then(() => fixtures.layouts.setValue(collectionSelect, collectionName)),
        )
        .then(() => this.el.$('paper-button[name="add"]'))
        .then((addButton) =>
          addButton
            .waitForVisible({ timeout: 10000 })
            .then(() => this.el.waitForEnabled('paper-button[name="add"]', { timeout: 10000 }))
            .then(() => addButton.click()),
        )
        .then(() =>
          driver.waitUntil(() => this.el.isVisible().then((visible) => !visible), {
            timeout: 20000,
            timeoutMsg: 'Dialog did not close after clicking add button',
          }),
        )
        .catch((error) => {
          if (attempt >= maxRetries) {
            throw new Error(`Failed to add to collection after ${maxRetries} attempts: ${error.message}`);
          }
          console.warn(`Attempt ${attempt} failed to add to collection: ${error.message}`);
          attempt += 1;
          return driver.pause(1000).then(() => tryOperation());
        });

    return tryOperation();
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
