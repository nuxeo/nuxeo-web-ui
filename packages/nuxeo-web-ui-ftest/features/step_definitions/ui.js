import { Then, When } from '@cucumber/cucumber';

When('I click the {string} button',  async function(button) {
  return await this.ui.drawer.open(button);
});

When('I select {string} from the View menu', function(option) {
  return this.ui.view(option);
});

When('I reload the page', function() {
  // XXX temporary fix for async issue with activity feed; will be fixed when NXP-21771 is tackled
  driver.pause(3000);
  this.ui.reload();
  $('#logo').waitForVisible();
});

Then('I can see {string} in the Activity feed', async function(activity) {
  // XXX temporary fix for async issue with activity feed; will be fixed when NXP-21771 is tackled
  driver.pause(3000);
  await this.ui.activityFeed.waitForVisible(); 
   const isVisible = await this.ui.activityFeed.getActivity(activity).waitForVisible();
  if (!isVisible) {
    throw new Error('Expected Activity feed is not visible');
  }
});

Then('I click the blob download button', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.downloadButton.click();
});
