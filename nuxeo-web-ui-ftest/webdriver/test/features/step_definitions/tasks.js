'use strict';

module.exports = function () {
  this.Then('I can see the list of tasks', () => this.ui.drawer.tasks.isVisible().should.be.true);
  this.Then('I can see the View Tasks Dashboard link', () => this.ui.drawer.tasksLink.isVisible().should.be.true);
  this.When('I click the View Tasks Dashboard link', () => this.ui.drawer.tasksLink.click());
  this.Then('I can see the Tasks Dashboard', () => this.ui.tasksDashboard.isVisible().should.be.true);
};
