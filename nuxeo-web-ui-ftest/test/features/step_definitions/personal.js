const {
  Then,
} = require('cucumber');

Then('I can see my personal workspace', function () { this.ui.drawer.personal.waitForVisible().should.be.true; });
