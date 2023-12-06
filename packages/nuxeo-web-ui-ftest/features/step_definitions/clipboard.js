/* eslint-disable no-await-in-loop */
import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I click remove button for {string} document', function(title) {
  this.ui.drawer.clipboard.waitForVisible();
  this.ui.drawer.clipboard.removeItem(title);
});

When('I click the clipboard move action', async function() {
  const isClipboarVisible = await this.ui.drawer.clipboard.isVisible();
  if (!isClipboarVisible) {
    const draw = this.ui.drawer;
    await draw.open('clipboard');
  }
  await this.ui.waitForToastNotVisible();
  await this.ui.drawer.clipboard.move();
});

When('I click the clipboard paste action', async function() {
  const drawerVisible = await this.ui.drawer.clipboard.isVisible();
  if (!drawerVisible) {
    await this.ui.drawer.open('clipboard');
  }
  await this.ui.waitForToastNotVisible();
  await this.ui.drawer.clipboard.paste();
});

Then('I can see the clipboard has {string} document', async function(title) {
  await this.ui.drawer.clipboard.waitForVisible();
  let found = false;
  await driver.waitUntil(
    async () => {
      const clipboardItems = await this.ui.drawer.clipboard.el.$$('#list .list-item-title');
      for (let index = 0; index < clipboardItems.length; index++) {
        const elementText = await clipboardItems[index].getText();
        if (elementText === title) found = true;
      }
      return found;
    },
    {
      timeout: 3000,
      timeoutMsg: 'step  definition clipborad 37',
    },
  );
});
Then('I can see the clipboard has {int} item(s)', async function(nb) {
  await this.ui.drawer.clipboard.waitForVisible();
  await driver.waitUntil(async () => {
    const nbItems = await this.ui.drawer.clipboard.nbItems;
    return nbItems === nb;
  });
});
Then('I can see clipboard actions disabled', function() {
  if (!this.ui.drawer.clipboard.isVisible()) {
    this.ui.drawer.open('clipboard');
  }
  const { moveButton } = this.ui.drawer.clipboard;
  moveButton.waitForVisible();
  driver.waitUntil(() => moveButton.getAttribute('disabled') !== null);

  const { pasteButton } = this.ui.drawer.clipboard;
  pasteButton.waitForVisible();
  driver.waitUntil(() => pasteButton.getAttribute('disabled') !== null);
});
