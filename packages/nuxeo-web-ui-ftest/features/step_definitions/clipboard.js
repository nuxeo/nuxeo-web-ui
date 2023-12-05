import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I click remove button for {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipBorad = await drawer.clipboard;
  await clipBorad.waitForVisible();
  await clipBorad.removeItem(title);
});

When('I click the clipboard move action', async function() {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  await clipBoard.waitForVisible();
  const isDrawerVisible = await clipBoard.isVisible();
  if (!isDrawerVisible) {
    await this.ui.drawer.open('clipboard');
  }
  await this.ui.waitForToastNotVisible();
  await clipBoard.move();
});

When('I click the clipboard paste action', async function() {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  const isClipBoardVisible = await clipBoard.isVisible();
  if (!isClipBoardVisible) {
    await this.ui.drawer.open('clipboard');
  }
  await this.ui.waitForToastNotVisible();
  await clipBoard.paste();
});

Then('I can see the clipboard has {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  await clipBoard.waitForVisible();
  await driver.waitUntil(
    async () => {
      let found = false;
      const clipboardItems = await clipBoard.el.$$('#list .list-item-title');
      for (let index = 0; index < clipboardItems.length; index++) {
        const elementText = await clipboardItems[index].getText();
        if (elementText === title) found = true;
      }
      console.log('alok', found);
      return found;
    },
    {
      timeout: 3000,
      timeoutMsg: 'step  definition clipborad 37',
    },
  );
});
Then('I can see the clipboard has {int} item(s)', async function(nb) {
  const drawer = await this.ui.drawer;
  const clipBoard = await drawer.clipboard;
  await clipBoard.waitForVisible();
  await driver.waitUntil(async () => {
    const drawers = await this.ui.drawer;
    const clipBoards = await drawers.clipboard;
    const nbItems = await clipBoards.nbItems;
    console.log('step definition', nbItems, nb);
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
