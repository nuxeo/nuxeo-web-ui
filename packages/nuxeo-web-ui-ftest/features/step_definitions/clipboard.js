import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I click remove button for {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  await clipBoard.waitForVisible();
  await clipBoard.removeItem(title);
});

When('I click the clipboard move action', async function() {
  try {
    const drawer = await this.ui.drawer;
    const clipBoard = await drawer.clipboard;
    const isVisible = await clipBoard.isVisible();
    if (!isVisible) {
      await drawer.open('clipboard');
    }
    await this.ui.waitForToastNotVisible();
    await clipBoard.move();
  } catch (error) {
    console.log(error);
  }
});

When('I click the clipboard paste action', function() {
  if (!this.ui.drawer.clipboard.isVisible()) {
    this.ui.drawer.open('clipboard');
  }
  this.ui.waitForToastNotVisible();
  this.ui.drawer.clipboard.paste();
});

Then('I can see the clipboard has {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  await clipBoard.waitForVisible();
});
Then('I can see the clipboard has {int} item(s)', async function(nb) {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  await clipBoard.waitForVisible();
  await driver.waitUntil(
    async () => {
      const abItemList = await clipBoard.nbItems;
      return abItemList === nb;
    },
    {
      timeout: 10000,
      timeoutMsg: 'expected 0002 text to be different after 5s',
    },
  );
});
Then('I can see clipboard actions disabled', function() {
  if (!this.ui.drawer.clipboard.isVisible()) {
    this.ui.drawer.open('clipboard');
  }
  const { moveButton } = this.ui.drawer.clipboard;
  moveButton.waitForVisible();
  driver.waitUntil(() => moveButton.getAttribute('disabled') !== null, {
    timeout: 10000,
    timeoutMsg: 'expected 0003 text to be different after 5s',
  });

  const { pasteButton } = this.ui.drawer.clipboard;
  pasteButton.waitForVisible();
  driver.waitUntil(() => pasteButton.getAttribute('disabled') !== null, {
    timeout: 10000,
    timeoutMsg: 'expected 0004 text to be different after 5s',
  });
});
