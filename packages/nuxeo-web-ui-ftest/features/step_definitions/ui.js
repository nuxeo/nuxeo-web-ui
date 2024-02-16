import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I click the {string} button', async function(button) {
  await driver.pause(1000);
  const drawer = await this.ui.drawer;
  const buttonToclick = await drawer.open(button);
  return buttonToclick;
});

When('I select {string} from the View menu', async function(option) {
  const ui = await this.ui;
  return ui.view(option);
});
When('I reload the page', async function() {
  // XXX temporary fix for async issue with activity feed; will be fixed when NXP-21771 is tackled
  await driver.pause(1000);
  await this.ui.reload();
  await $('#logo').waitForVisible();
});
Then('I can see {string} in the Activity feed', async function(activity) {
  // XXX temporary fix for async issue with activity feed; will be fixed when NXP-21771 is tackled
  await driver.pause(10000);
  const activityFeed = await this.ui.activityFeed;
  await activityFeed.waitForVisible();
  const activityTab = await activityFeed.getActivity(activity);
  const activityTabVisible = await activityTab.waitForVisible();
  await activityTabVisible.should.be.true;
});
Then('I click the blob download button', async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  const button = await page.downloadButton;
  await button.click();
});
