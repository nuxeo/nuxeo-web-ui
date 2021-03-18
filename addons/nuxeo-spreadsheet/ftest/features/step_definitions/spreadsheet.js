import { Then, When } from '@cucumber/cucumber';
import Spreadsheet from '../../pages/spreadsheet';

When('I open the spreadsheet', function() {
  const button = this.ui.results.actions.element('nuxeo-spreadsheet-button').click();

  button.waitForVisible('#dialog');

  const iframe = button.element('#iframe');
  driver.frame(iframe.value);

  this.spreadsheet = new Spreadsheet();
});

When('I see the spreadsheet dialog', function() {
  const button = this.ui.browser.results.actions.element('nuxeo-spreadsheet-button');
  button.waitForVisible('#dialog');
});

Then('I can see the spreadsheet results actions button', function() {
  const { results } = this.ui;

  if (results.displayMode !== 'table') {
    results.toggleTableView.click();
  }

  results.actions.waitForVisible('nuxeo-spreadsheet-button');
});

Then('I can see the {string} spreadsheet column', function(column) {
  assert(this.spreadsheet, 'Spreadsheet editor does not exist');
  return this.spreadsheet.headers.includes(column);
});

When('I set the spreadsheet cell {int},{int} to {string}', function(row, col, value) {
  const { spreadsheet } = this;
  assert(spreadsheet, 'Spreadsheet does not exist');

  spreadsheet.setData(row, col, value);
});

When('I save the spreadsheet', function() {
  const { spreadsheet } = this;
  assert(spreadsheet, 'Spreadsheet does not exist');

  spreadsheet.save();

  const { console } = spreadsheet;
  driver.waitUntil(() => console.getText() === '1 rows saved');
});

When('I close the spreadsheet', function() {
  const { spreadsheet } = this;
  assert(spreadsheet, 'Spreadsheet does not exist');

  spreadsheet.close();
  driver.frame();
});

Then('I see {string} in the results table cell {int},{int}', function(value, row, col) {
  const { results } = this.ui;
  results.waitForVisible();
  const tableRow = results.el.elements('nuxeo-data-table-row:not([header])').value[row];
  const tableCell = tableRow.elements('nuxeo-data-table-cell').value[col];
  expect(tableCell.getText()).to.equal(value);
});
