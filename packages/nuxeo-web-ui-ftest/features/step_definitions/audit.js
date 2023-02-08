import { Then } from '@cucumber/cucumber';

Then('I can see the audit table', function() {
  this.ui.administration.audit.isAuditTableDisplayed.should.be.true;
});

Then('I have a non empty audit table', function() {
  this.ui.administration.audit.isAuditTableFilled.should.be.true;
});

Then('I can see {string} entry in audit table', function(performedAction) {
  this.ui.administration.audit.waitForHasEntry(performedAction).should.be.true;
});
