import { Then, When } from '@cucumber/cucumber';

When('I can click on recently viewed documents item {string}', function(title) {
  this.ui.drawer.recents.waitForVisible();
  this.ui.drawer.recents.waitForHasMember(title).should.be.true;
  this.ui.drawer.recents.select(title).should.be.true;
});

Then('I can see the list of recently viewed documents', function() {
  this.ui.drawer.recents.waitForVisible().should.be.true;
});

Then('I can see the list of recently viewed documents has {int} item(s)', function(nb) {
  this.ui.drawer.recents.waitForVisible();
  driver.waitUntil(() => this.ui.drawer.recents.nbItems === nb);
});

Then('I can see the list of recently viewed documents has {string} document', function(title) {
  this.ui.drawer.recents.waitForVisible();
  this.ui.drawer.recents.waitForHasMember(title).should.be.true;
});
