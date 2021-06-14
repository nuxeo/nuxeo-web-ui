import { Then } from '@cucumber/cucumber';

Then('I can see my personal workspace', function() {
  this.ui.drawer.personal.waitForVisible().should.be.true;
});
