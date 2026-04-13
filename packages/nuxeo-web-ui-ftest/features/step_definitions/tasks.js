// eslint-disable-next-line import/no-extraneous-dependencies
import { Then, When } from '@cucumber/cucumber';

When('I click the View Tasks Dashboard link', async function () {
  const dashboardLink = await this.ui.drawer.tasks.dashboardLink;
  await dashboardLink.click();
});
When(/^I (\w+) the task for following actors:$/, async function (option, table) {
  option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');

  if (option === 'delegate') {
    const delegateOption = await this.ui.browser.documentTaskView.delegateOption;
    await delegateOption.isVisible();
    await delegateOption.click();
  } else if (option === 'reassign') {
    const reassignOption = await this.ui.browser.documentTaskView.reassignOption;
    await reassignOption.isVisible();
    await reassignOption.click();
  }
  const rows = table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // eslint-disable-next-line no-await-in-loop
    await this.ui.browser.documentTaskView.setUserOrGroup(row[0]);
  }
  const confirmButton = await this.ui.browser.documentTaskView.confirmButton;
  await confirmButton.waitForVisible();
  await confirmButton.click();
  await driver.waitForExist('iron-overlay-backdrop', 5000, true);
});

Then('I can see the list of tasks', async function () {
  const ui = await this.ui;
  const drawer = await ui.drawer;
  const task = await drawer.tasks.waitForVisible();
  task.should.be.true;
});
Then('I can see the View Tasks Dashboard link', async function () {
  const dashboardLink = await this.ui.drawer.tasks.dashboardLink;
  const output = await dashboardLink.waitForVisible();
  output.should.be.true;
});
Then('I can see the Tasks Dashboard', async function () {
  const taskVisible = await this.ui.tasks.waitForVisible();
  taskVisible.should.be.true;
});
Then(/^I can process the workflow$/, async function () {
  await this.ui.browser.documentTaskView.waitForVisible();
});
Then(/^I can see the (\w+) option available$/, async function (option) {
  option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');
  if (option === 'delegate') {
    const delegateOption = await this.ui.browser.documentTaskView.delegateOption;
    const delegateOptionVisible = await delegateOption.isVisible();
    delegateOptionVisible.should.be.true;
  } else if (option === 'reassign') {
    const reassignOption = await this.ui.browser.documentTaskView.reassignOption;
    const reassignOptionVisible = await reassignOption.isVisible();
    reassignOptionVisible.should.be.true;
  }
});
Then(/^I can't see the (\w+) option available$/, async function (option) {
  option.should.to.be.oneOf(['delegate', 'reassign'], 'An unknown type was passed as argument');
  if (option === 'delegate') {
    const delegateOption = await this.ui.browser.documentTaskView.delegateOption;
    const delegateOptionVisible = await delegateOption.isVisible();
    delegateOptionVisible.should.be.false;
  } else if (option === 'reassign') {
    const reassignOption = await this.ui.browser.documentTaskView.reassignOption;
    const reassignOptionVisible = await reassignOption.isVisible();
    reassignOptionVisible.should.be.false;
  }
});
Then(/^I can see that "([^"]*)" belongs to (\w+) actors$/, async function (user, option) {
  option.should.to.be.oneOf(['delegated', 'assigned'], 'An unknown type was passed as argument');

  // Workaround to WDIO limitation
  const browser = await this.ui.browser;
  const documentTaskView = await browser.documentTaskView;
  await documentTaskView.waitForVisible();
  const actorsSelector = `${option === 'delegated' ? '#delegatedActors' : '#assignedActors'}`;
  await documentTaskView.waitForVisible(`${actorsSelector} nuxeo-tags`);
  // Wait for nuxeo-user-tag inner content to render (depends on async _currentUser from nuxeo-connection)
  await documentTaskView.waitForVisible(`${actorsSelector} nuxeo-user-tag .tag .username-container`);
  const actorsElement =
    option === 'delegated' ? await documentTaskView.delegatedActors : await documentTaskView.assignedActors;
  const result = await documentTaskView.actorExists(actorsElement, user);
  result.should.be.true;
});
Then('I can see the my task list has {int} item(s)', async function (nb) {
  const ui = await this.ui;
  const drawer = await ui.drawer;
  await drawer.tasks.waitForVisible();
  const result = await drawer.tasks.nbItems;
  if (result !== nb) {
    throw new Error(`Expected task count ${nb} but found ${result}`);
  }
});
Then('I can perform the {string} task action', async function (name) {
  await this.ui.browser.documentTaskView.performAction(name);
});
