// eslint-disable-next-line import/no-extraneous-dependencies
import { Then, When } from '@cucumber/cucumber';
import Spreadsheet from '../../pages/spreadsheet';

When('I open the spreadsheet', async function() {
  const result = await this.ui.results;
  const browser = await this.ui.browser;
  const actions = await result.actions;
  const buttonEle = await actions.element('nuxeo-spreadsheet-button');
  await buttonEle.click();
  const dialog = await buttonEle.element('#dialog');
  await dialog.waitForVisible();
  const iframe = await buttonEle.element('#iframe');
  await iframe.waitForExist();
  const browserEle = await browser.el;
  await browserEle.switchToFrame(iframe);
  this.spreadsheet = await new Spreadsheet();
});

When('I see the spreadsheet dialog', function() {
  const button = this.ui.browser.results.actions.element('nuxeo-spreadsheet-button');
  button.waitForVisible('#dialog');
});

Then('I can see the spreadsheet results actions button', async function() {
  const currentUI = await this.ui;
  const results = await currentUI.results;
  if ((await results.displayMode) !== 'table') {
    const toggleTableViewBtn = await results.toggleTableView;
    await toggleTableViewBtn.click();
  }
  const button = await results.actions;
  await button.waitForVisible('nuxeo-spreadsheet-button');
});

Then('I can see the {string} spreadsheet column', async function(column) {
  const spreadsheet = await this.spreadsheet;
  if (spreadsheet) {
    const header = await spreadsheet.headers;
    await header.includes(column);
  } else {
    throw new Error('Error: Spreadsheet does not exist!!');
  }
});

When('I set the spreadsheet cell {int},{int} to {string}', async function(row, col, value) {
  const spreadsheet = await this.spreadsheet;
  if (spreadsheet) {
    spreadsheet.setData(row, col, value);
  } else {
    throw new Error('Error: Spreadsheet does not exist!!');
  }
});

When('I save the spreadsheet', async function() {
  const spreadsheet = await this.spreadsheet;
  if (spreadsheet) {
    await spreadsheet.save();
    const consoleEle = await spreadsheet.console;
    await consoleEle.getText();
  } else {
    throw new Error('Error: Spreadsheet does not exist!!');
  }
});

When('I close the spreadsheet', async function() {
  const spreadsheet = await this.spreadsheet;
  if (spreadsheet) {
    await spreadsheet.close();
    await browser.switchToFrame(null);
  } else {
    throw new Error('Error: Spreadsheet does not exist!!');
  }
});

Then('I see {string} in the results table cell {int},{int}', async function(value, row, col) {
  const results = await this.ui.results;
  await results.waitForVisible();
  const tableRow = await results.el.elements('nuxeo-data-table-row:not([header])');
  const tableRowValue = await tableRow[row];
  const tableCell = await tableRowValue.elements('nuxeo-data-table-cell');
  const tableCol = await tableCell[col];
  const tableColText = await tableCol.getText();
  tableColText.should.be.equal(value);
});
