import { Then, When } from '@cucumber/cucumber';

When('I click the View Tasks Dashboard link', function() {
  this.ui.drawer.tasks.dashboardLink.click();
});
When(/^I (\w+) the task for following actors:$/, function(option, table) {
  option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');

  if (option === 'delegate') {
    this.ui.browser.documentTaskView.delegateOption.click();
  } else if (option === 'reassign') {
    this.ui.browser.documentTaskView.reassignOption.click();
  }
  table.rows().map((row) => this.ui.browser.documentTaskView.setUserOrGroup(row[0]));

  this.ui.browser.documentTaskView.confirmButton.waitForVisible();
  this.ui.browser.documentTaskView.confirmButton.click();
  driver.waitForExist('iron-overlay-backdrop', driver.options.waitForTimeout, true);
});

Then('I can see the list of tasks', function() {
  this.ui.drawer.tasks.waitForVisible().should.be.true;
});
Then('I can see the View Tasks Dashboard link', function() {
  this.ui.drawer.tasks.dashboardLink.waitForVisible().should.be.true;
});
Then('I can see the Tasks Dashboard', function() {
  this.ui.tasks.waitForVisible().should.be.true;
});
Then(/^I can process the workflow$/, function() {
  this.ui.browser.documentTaskView.waitForVisible();
});
Then(/^I can see the (\w+) option available$/, function(option) {
  option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');
  if (option === 'delegate') {
    this.ui.browser.documentTaskView.delegateOption.isVisible().should.be.true;
  } else if (option === 'reassign') {
    this.ui.browser.documentTaskView.reassignOption.isVisible().should.be.true;
  }
});
Then(/^I can't see the (\w+) option available$/, function(option) {
  option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');
  if (option === 'delegate') {
    this.ui.browser.documentTaskView.delegateOption.isVisible().should.be.false;
  } else if (option === 'reassign') {
    this.ui.browser.documentTaskView.reassignOption.isVisible().should.be.false;
  }
});
Then(/^I can see that "([^"]*)" belongs to (\w+) actors$/, function(user, option) {
  option.should.to.be.oneOf(['delegated', 'assigned'], 'An unknown type was passed as argument');

  // Workaround to WDIO limitation
  const { documentTaskView } = this.ui.browser;
  documentTaskView.waitForVisible();
  documentTaskView.waitForVisible(`${option === 'delegated' ? '#delegatedActors' : '#assignedActors'} nuxeo-tags`);

  driver.waitUntil(() => {
    const actorsElement = option === 'delegated' ? documentTaskView.delegatedActors : documentTaskView.assignedActors;
    return documentTaskView.actorExists(actorsElement, user);
  });
});
Then('I can see the my task list has {int} item(s)', function(nb) {
  this.ui.drawer.tasks.waitForVisible();
  driver.waitUntil(() => this.ui.drawer.tasks.nbItems === nb);
});
Then('I can perform the {string} task action', function(name) {
  this.ui.browser.documentTaskView.performAction(name);
});
