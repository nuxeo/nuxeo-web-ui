/* eslint-disable no-await-in-loop */
import { Then, When } from '../../node_modules/@cucumber/cucumber';

When(/^I select group from the dropdown menu$/, async function() {
  const groupELe = this.ui.group;
  const groupDropEle = await groupELe.dropdown;
  await groupDropEle.waitForVisible();
  const groupItemEle = await groupELe.groupItem;
  await groupItemEle.click();
});

When(/^I can see the new group form$/, async function() {
  const groupELe = this.ui.group;
  const groupFormEle = await groupELe.createGroupForm;
  await groupFormEle.waitForVisible();
});

Then(/^I can create a group with the following properties:$/, async function(table) {
  const groupELe = this.ui.group;
  await groupELe.fillMultipleValues(table);
  const groupButtonEle = await groupELe.createGroupButton;
  await groupButtonEle.click();
});

Then(/^I can search for the following groups$/, async function(table) {
  const rows = await table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = await rows[i];
    const rowFirstCol = await row[0];
    const groups = await this.ui.group;
    await groups.searchFor(rowFirstCol);
    const resultEle = await groups.searchResult(rowFirstCol);
    const visible = await resultEle.waitForVisible();
    if (!visible) {
      throw new Error('Result not found');
    }
    await groups.waitForVisible('nuxeo-card[name="groups"] .table nuxeo-group-tag');
    const ele = await groups.el.element('nuxeo-card[name="groups"] .table nuxeo-group-tag');
    await ele.click();
    await groups.waitForVisible('nuxeo-group-management');
    const groupEle = await groups.el.elements('.header .groupname');
    for (let j = 0; j < groupEle.length; j++) {
      const groupText = await groupEle[i].getText();
      if (groupText === rowFirstCol) {
        const result = await groupEle[i].waitForVisible();
        result.should.be.true;
      }
    }
  }
});

Then(/^I can edit the following groups$/, async function(table) {
  const rows = await table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = await rows[i];
    const editgroup = await this.ui.group;
    await editgroup.searchFor(row[0]);
    const result = await editgroup.searchResult(row[0]);
    await result.waitForVisible();
    await result.click();
    const editgroupbutton = await editgroup.editGroupButton;
    await editgroupbutton.waitForVisible();
    await editgroupbutton.click();
    const label = await editgroup.editGroupLabel;
    await fixtures.layouts.setValue(label, row[1]);
    const editDialogEle = await editgroup.editGroupDialogButton;
    await editDialogEle.waitForVisible();
    await editDialogEle.click();
    await browser.back();
  }
});

Then(/^I can delete the following groups$/, async function(table) {
  const rows = await table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = await rows[i];
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
  }
});
