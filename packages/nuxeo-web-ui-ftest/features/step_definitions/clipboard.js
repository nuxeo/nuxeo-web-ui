/* eslint-disable no-await-in-loop */
import { Then, When } from '@cucumber/cucumber';

When('I click remove button for {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipboard = await drawer.clipboard;
  await clipboard.waitForVisible();
  await clipboard.removeItem(title);
});

When('I click the clipboard move action', async function() {
  const drawer = await this.ui.drawer;
  const clipboard = await drawer.clipboard;
  const isClipboarVisible = await clipboard.isVisible();
  if (!isClipboarVisible) {
    await drawer.open('clipboard');
  }
  await this.ui.waitForToastNotVisible();
  await clipboard.move();
});

When('I click the clipboard paste action', async function() {
  const drawer = await this.ui.drawer;
  const clipboard = await drawer.clipboard;
  const isClipboarVisible = await clipboard.isVisible();
  if (!isClipboarVisible) {
    await drawer.open('clipboard');
  }
  await this.ui.waitForToastNotVisible();
  await clipboard.paste();
});

Then('I can see the clipboard has {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipboardEle = await drawer.clipboard;
  await clipboardEle.waitForVisible();
  let found = false;
  const clipboardItems = await clipboardEle.el.$$('#list .list-item-title');
  for (let index = 0; index < clipboardItems.length; index++) {
    const elementText = await clipboardItems[index].getText();
    if (elementText === title) found = true;
  }
  return found;
});

Then('I can see the clipboard has {int} item(s)', async function(nb) {
  const drawer = await this.ui.drawer;
  const clipboard = await drawer.clipboard;
  await clipboard.waitForVisible();
  const nbItems = await clipboard.nbItems;
  if (nbItems !== nb) {
    throw new Error(`Expected clipboard count to be ${nb} but found ${nbItems}`);
  }
});
Then('I can see clipboard actions disabled', async function() {
  const drawer = await this.ui.drawer;
  const clipboard = await drawer.clipboard;
  const isClipboardVisible = await clipboard.isVisible();
  if (!isClipboardVisible) {
    await drawer.open('clipboard');
  }
  const moveButton = await clipboard.moveButton;
  await moveButton.waitForVisible();
  await driver.waitUntil(async () => (await moveButton.getAttribute('disabled')) !== null, {
    timeoutMsg: 'step  definition clipborad 65',
  });
  const pasteButton = await clipboard.pasteButton;
  await pasteButton.waitForVisible();
  await driver.waitUntil(async () => (await pasteButton.getAttribute('disabled')) !== null, {
    timeoutMsg: 'step  definition clipborad 70',
  });
});
