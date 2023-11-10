import { Then } from '@cucumber/cucumber';

Then('I can see the audit table', async function() {
  const isAuditTableDisplay= await this.ui.administration.audit.isAuditTableDisplayed;
  isAuditTableDisplay.should.be.true;
});

Then('I have a non empty audit table',async function() {
  const isAuditTableFilled= await this.ui.administration.audit.isAuditTableFilled;
  isAuditTableFilled.should.be.true;
});

Then('I can see {string} entry in audit table',async function(performedAction) {
  await this.ui.administration.audit.waitForHasEntry(performedAction).should.be.true;
});
