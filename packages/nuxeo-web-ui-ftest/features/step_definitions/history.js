import { Then } from '@cucumber/cucumber';

Then('I can see the history table', function() {
  this.ui.historyTable.isHistoryTableVisible.should.be.true;
});

Then('I have a non empty history table', function() {
  this.ui.historyTable.isHistoryTableFilled.should.be.true;
});

Then('I can see {string} entry in history table', function(performedAction) {
  this.ui.historyTable.waitForHasEntry(performedAction).should.be.true;
});
