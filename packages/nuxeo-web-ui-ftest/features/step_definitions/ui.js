import { Then, When } from 'cucumber';

When('I click the {string} button', function(button) {
  return this.ui.drawer.open(button);
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
Then('I can see {string} in the Activity feed', function(activity) {
  // XXX temporary fix for async issue with activity feed; will be fixed when NXP-21771 is tackled
  driver.pause(3000);
  this.ui.activityFeed.waitForVisible();
  this.ui.activityFeed.getActivity(activity).waitForVisible().should.be.true;
});
