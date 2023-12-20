import Spreadsheet from '../../pages/spreadsheet';
import {  Then, When } from '../../node_modules/@cucumber/cucumber';

When('I open the spreadsheet', async function() {
  const result = await this.ui.results;
  const actions = await result.actions;
  const btn = await actions.element('nuxeo-spreadsheet-button');
  await btn.click();
  const dialog = await btn.element('#dialog')
  await dialog.waitForVisible();

  const iframe = await btn.element('#iframe');
  await iframe.waitForExist();
  await browser.switchToFrame(iframe);

  this.spreadsheet = await new Spreadsheet();
});

When('I see the spreadsheet dialog', function() {
  const button = this.ui.browser.results.actions.element('nuxeo-spreadsheet-button');
  button.waitForVisible('#dialog');
});

Then('I can see the spreadsheet results actions button',async function() {
  // const { results } = await this.ui;
  const resT = await this.ui;
  const  results  = await resT.results;
  if (await results.displayMode !== 'table') {
    const btn =  await results.toggleTableView;
    await btn.click();
  }
  const button = await results.actions;
  await button.waitForVisible('nuxeo-spreadsheet-button');
});

Then('I can see the {string} spreadsheet column', async function(column) {
  const spreadsheet = await this.spreadsheet;
  assert(spreadsheet, 'Spreadsheet editor does not exist');
   const header =await spreadsheet.headers;
   let head = await header.includes(column)
});

When('I set the spreadsheet cell {int},{int} to {string}', async function(row, col, value) {
  const spreadsheet = await this.spreadsheet;
  assert(spreadsheet, 'Spreadsheet does not exist');

  spreadsheet.setData(row, col, value);
});

When('I save the spreadsheet', async function() {
  const spreadsheet = await this.spreadsheet;
  assert(spreadsheet, 'Spreadsheet does not exist');
  await spreadsheet.save(); 
  const consoleEle = await spreadsheet.console;
  const temp = await consoleEle.getText();
  // await driver.waitUntil(async () => await console.getText() === '1 rows saved', { timeout: 30000 });
  if(temp !== '1 rows saved'){
    throw Error("save Error")
  }
});


When('I close the spreadsheet', async function() {
  const spreadsheet = await this.spreadsheet;
  assert(spreadsheet, 'Spreadsheet does not exist');
  await spreadsheet.close();
  // driver.frame();
  await driver.switchTo().defaultContent();
});

Then('I see {string} in the results table cell {int},{int}', function(value, row, col) {
  const { results } = this.ui;
  results.waitForVisible();
  const tableRow = results.el.elements('nuxeo-data-table-row:not([header])').value[row];
  const tableCell = tableRow.elements('nuxeo-data-table-cell').value[col];
  expect(tableCell.getText()).to.equal(value);
});
