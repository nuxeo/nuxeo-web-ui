// eslint-disable-next-line import/no-extraneous-dependencies
import { Then } from '@cucumber/cucumber';

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

Then('I can see {string} entry in history table', async function(performedAction) {
  const historyTable = await this.ui.historyTable;
  const hasEntry = await historyTable.waitForHasEntry(performedAction);
  hasEntry.should.be.true;
});
