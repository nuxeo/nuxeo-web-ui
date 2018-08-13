'use strict';

module.exports = function () {
  this.When('I click the View Tasks Dashboard link', () => this.ui.drawer.tasks.dashboardLink.click());
  this.When(/^I (\w+) the task for following actors:$/, (option, table) => {
    option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');

    if (option === 'delegate') {
      this.ui.browser.documentTaskView.delegateOption.click();
    } else if (option === 'reassign') {
      this.ui.browser.documentTaskView.reassignOption.click();
    }
    this.ui.browser.documentTaskView.assignmentDialog.waitForVisible();
    table.rows().map((row) => this.ui.browser.documentTaskView.setUserOrGroup(row[0]));

    this.ui.browser.documentTaskView.confirmButton.waitForVisible();
    this.ui.browser.documentTaskView.confirmButton.click();
  });

  this.Then('I can see the list of tasks', () => this.ui.drawer.tasks.waitForVisible().should.be.true);
  this.Then('I can see the View Tasks Dashboard link', () =>
      this.ui.drawer.tasks.dashboardLink.waitForVisible().should.be.true);
  this.Then('I can see the Tasks Dashboard', () => this.ui.tasks.waitForVisible().should.be.true);
  this.Then(/^I can process the workflow$/, () => this.ui.browser.documentTaskView.waitForVisible());
  this.Then(/^I can see the (\w+) option available$/, (option) => {
    option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');
    if (option === 'delegate') {
      this.ui.browser.documentTaskView.delegateOption.isVisible().should.be.true;
    } else if (option === 'reassign') {
      this.ui.browser.documentTaskView.reassignOption.isVisible().should.be.true;
    }
  });
  this.Then(/^I can't see the (\w+) option available$/, (option) => {
    option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');
    if (option === 'delegate') {
      this.ui.browser.documentTaskView.delegateOption.isVisible().should.be.false;
    } else if (option === 'reassign') {
      this.ui.browser.documentTaskView.reassignOption.isVisible().should.be.false;
    }
  });
  this.Then(/^I can see that "([^"]*)" belongs to (\w+) actors$/, (user, option) => {
    option.should.to.be.oneOf(['delegated', 'assigned'], 'An unknown type was passed as argument');

    // Workaround to WDIO limitation
    const documentTaskView = this.ui.browser.documentTaskView;
    documentTaskView.waitForVisible();
    documentTaskView.waitForVisible(`${option === 'delegated' ? '#delegatedActors' : '#assignedActors'} nuxeo-tags`);

    const actorsElement = option === 'delegated' ? documentTaskView.delegatedActors : documentTaskView.assignedActors;
    documentTaskView.actorExists(actorsElement, user).should.be.true;
  });
  this.Then('I can see the my task list has "$nb" items', (nb) => {
    this.ui.drawer.tasks.waitForVisible();
    this.ui.drawer.tasks.nbItems.should.be.equals(parseInt(nb));
  });
};
