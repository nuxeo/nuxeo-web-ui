import { Then, When } from '@cucumber/cucumber';

When('I click remove button for {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const clipBorad = drawer.clipboard;
  await clipBorad.waitForVisible();
  await clipBorad.removeItem(title);
});

When('I click the clipboard move action', async function() {
  const drawer = await this.ui.drawer;
  const clipBorad = await drawer.clipboard;
  const isclipBoardVisible = await clipBorad.isVisible();
  if (!isclipBoardVisible) {
    drawer.open('clipboard');
  }
  this.ui.waitForToastNotVisible();
  clipBorad.move();
});

When('I click the clipboard paste action', function() {
  if (!this.ui.drawer.clipboard.isVisible()) {
    this.ui.drawer.open('clipboard');
  }
  this.ui.waitForToastNotVisible();
  this.ui.drawer.clipboard.paste();
});

Then('I can see the clipboard has {string} document', function(title) {
  this.ui.drawer.clipboard.waitForVisible();
  driver.waitUntil(() => this.ui.drawer.clipboard.el.hasElementByTextContent('#list .list-item-title', title), {
    timeout: 10000,
    timeoutMsg: 'expecteed clipbord.js text 33',
  });
});
Then('I can see the clipboard has {int} item(s)', async function(nb) {
  const drawer = await this.ui.drawer;
  const clipBorad = await drawer.clipboard;
  await clipBorad.waitForVisible();
  const clipBoradItem = await clipBorad.nbItems;
  console.log('JJJJJJJJJ', clipBoradItem, nb);
  driver.waitUntil(
    () => {
      return clipBoradItem === nb;
    },
    {
      timeout: 10000,
      timeoutMsg: 'expected 98077 text to be different after 5s',
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
    timeoutMsg: 'expecteed clipbordjs text 60',
  });

  const { pasteButton } = this.ui.drawer.clipboard;
  pasteButton.waitForVisible();
  driver.waitUntil(() => pasteButton.getAttribute('disabled') !== null, {
    timeout: 10000,
    timeoutMsg: 'expecteed clipboard text to be differeent 67',
  });
});
