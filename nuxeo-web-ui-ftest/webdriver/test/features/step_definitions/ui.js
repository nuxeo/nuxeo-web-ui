'use strict';

module.exports = function () {
  this.When('I click the "$button" button', (button) => this.ui.drawer.open(button));
  this.When('I select "$option" from the View menu', (option) => this.ui.view(option));
  this.When('I reload the page', () => this.ui.reload());
  this.Then('I can see "$activity" in the Activity feed', (activity) => {
    this.ui.activityFeed.waitForVisible();
    this.ui.getActivity(activity).isVisible().should.be.true;
  });

};
