import { Then, When } from '@cucumber/cucumber';

When('I click the Nuxeo logo', function() {
  return this.ui.goHome();
});

Then('I can see my home', function() {
  this.ui.home.waitForVisible().should.be.true;
});

Then('I have a {string} card', function(title) {
  this.ui.home.card(title).waitForVisible().should.be.true;
});
