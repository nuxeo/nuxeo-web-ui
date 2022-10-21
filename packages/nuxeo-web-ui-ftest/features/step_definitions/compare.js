import { Then, When } from '@cucumber/cucumber';

When('I can click on the compare button', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.compare.click();
});

Then('I can see compare document page is displayed', function() {
  this.ui.browser.comparePage.isDisplayed();
});
