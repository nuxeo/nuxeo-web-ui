'use strict';

module.exports = function () {
  this.Then('I can see the list of tasks', () => this.ui.drawer.tasks.waitForVisible().should.be.true);
  this.Then('I can see the View Tasks Dashboard link', () => this.ui.drawer.tasksLink.waitForVisible().should.be.true);
  this.When('I click the View Tasks Dashboard link', () => this.ui.drawer.tasksLink.click());
  this.Then('I can see the Tasks Dashboard', () => this.ui.tasksDashboard.waitForVisible().should.be.true);
};
