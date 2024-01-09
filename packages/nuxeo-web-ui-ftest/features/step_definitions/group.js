import { Then, When } from '../../node_modules/@cucumber/cucumber';

When(/^I select group from the dropdown menu$/, async function() {
  const groupDropEle = await this.ui.group.dropdown;
  await groupDropEle.waitForVisible();
  const groupItemEle = await this.ui.group.groupItem;
  groupItemEle.click();
});

When(/^I can see the new group form$/, async function() {
  const groupFormEle = await this.ui.group.createGroupForm;
  await groupFormEle.waitForVisible();
});

Then(/^I can create a group with the following properties:$/, async function(table) {
  const groupELe = this.ui.group;
  await groupELe.fillMultipleValues(table);
  const groupButtonEle = await groupELe.createGroupButton;
  groupButtonEle.click();
});

Then(/^I can search for the following groups$/, function(table) {
  table.rows().forEach(async (row) => {
    await this.ui.group.searchFor(row[0]);
    const resultEle = await this.ui.group.searchResult(row[0]);
    const visible = await resultEle.waitForVisible();
    if (!visible) {
      throw new Error('Result not found');
    }
    await this.ui.group.waitForVisible('nuxeo-card[name="groups"] .table nuxeo-group-tag');
    await this.ui.group.click('nuxeo-card[name="groups"] .table nuxeo-group-tag');
    this.ui.group.waitForVisible('nuxeo-group-management');
    const group = this.ui.group.el.elements('.header .groupname').find((e) => e.getText() === row[0]);
    group.waitForVisible().should.be.true;
  });
});

Then(/^I can edit the following groups$/, async function(table) {
  await table.rows().forEach(async (row) => {
    await this.ui.group.searchFor(row[0]);
    await driver.waitUntil(
      async () => {
        // XXX horrible temporary workaround for stale element when clicking the result (see NXP-27621)
        try {
          const result = await this.ui.group.searchResult(row[0]);
          await result.waitForVisible();
          await result.click();
          return true;
        } catch (e) {
          return false;
        }
      },
      {
        timeoutMsg: 'edit following groups timedout',
      },
    );
    const editgroup = await this.ui.group;
    const editgroupbutton = await editgroup.editGroupButton;
    await editgroupbutton.waitForVisible();
    await editgroupbutton.click();
    await fixtures.layouts.setValue(this.ui.group.editGroupLabel, row[1]);
    const editDialogEle = await editgroup.editGroupDialogButton;
    await editDialogEle.waitForVisible();
    await editDialogEle.click();
    await browser.back();
  });
});

Then(/^I can delete the following groups$/, async function(table) {
  await table.rows().forEach(async (row) => {
    const group = await this.ui.group;
    await group.searchFor(row[0]);
    const searchResultEle = await group.searchResult(row[0]);
    await searchResultEle.waitForVisible();
    await searchResultEle.click();
    const deleteEle = await group.deleteGroupButton;
    await deleteEle.waitForVisible();
    await deleteEle.click();
    const confirmEle = await group.confirmDeleteGroupButton;
    await confirmEle.waitForVisible();
    await confirmEle.click();
  });
});
