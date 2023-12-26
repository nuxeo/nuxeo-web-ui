import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I can see the history table', async function() {
  const historyTable = await this.ui.historyTable;
  const isHistoryTableDisplayed = await historyTable.isHistoryTableVisible;
  if (!isHistoryTableDisplayed) {
    throw new Error('History Table not found');
  }
});

Then('I have a non empty history table', async function() {
  const historyTable = await this.ui.historyTable;
  const isTableFilled = await historyTable.isHistoryTableFilled;

  if (!isTableFilled) {
    throw new Error('History Table not found');
  }
});

Then('I can see {string} entry in history table', function(performedAction) {
  this.ui.historyTable.waitForHasEntry(performedAction).should.be.true;
});
