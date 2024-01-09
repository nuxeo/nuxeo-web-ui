import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I can see the audit table', async function() {
  const isAuditTableDisplay = await this.ui.administration.audit.isAuditTableDisplayed;
  isAuditTableDisplay.should.be.true;
});

Then('I have a non empty audit table', async function() {
  const isAuditTableFilled = await this.ui.administration.audit.isAuditTableFilled;
  isAuditTableFilled.should.be.true;
});

Then('I can see {string} entry in audit table', async function(performedAction) {
  const administration = await this.ui.administration;
  const audit = await administration.audit;
  const hasEntry = await audit.waitForHasEntry(performedAction);
  hasEntry.should.be.true;
});
