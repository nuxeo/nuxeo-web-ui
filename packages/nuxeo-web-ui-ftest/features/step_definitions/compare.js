import { Then, When } from '@cucumber/cucumber';

When('I can click on the compare button', async function() {
  await this.ui.browser.waitForVisible();
  const toolbarEle = await this.ui.browser.selectionToolbar;
  const compareEle = await toolbarEle.compare;
  await compareEle.click();
});

Then('I can see compare document page is displayed', function() {
  this.ui.browser.comparePage.isDisplayed();
});
