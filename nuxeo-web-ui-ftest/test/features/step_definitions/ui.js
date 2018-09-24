'use strict';

module.exports = function () {
  this.When('I click the "$button" button', (button) => this.ui.drawer.open(button));
  this.When('I select "$option" from the View menu', (option) => this.ui.view(option));
  this.When('I reload the page', () => {
    // XXX temporary fix for async issue with activity feed; will be fixed when NXP-21771 is tackled
    driver.pause(1000);
    this.ui.reload();
  });
  this.Then('I can see "$activity" in the Activity feed', (activity) => {
    this.ui.activityFeed.waitForVisible();
    this.ui.activityFeed.getActivity(activity).waitForVisible().should.be.true;
  });
};
