import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I can click on the compare button', async function() {
  await this.ui.browser.waitForVisible();
  const selectiontool = await this.ui.browser.selectionToolbar;
  const compButton = await selectiontool.compare;
  compButton.click();
});

Then('I can see compare document page is displayed', function() {
  this.ui.browser.comparePage.isDisplayed();
});
