import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I can click on recently viewed documents item {string}', async function(title) {
  await this.ui.drawer.recents.waitForVisible();
  const member = await this.ui.drawer.recents.waitForHasMember(title);
  member.should.be.true;
  const selectTitle = await this.ui.drawer.recents.select(title);
  selectTitle.should.be.true;
});

Then('I can see the list of recently viewed documents', function() {
  this.ui.drawer.recents.waitForVisible().should.be.true;
});

Then('I can see the list of recently viewed documents has {int} item(s)', async function(nb) {
  await this.ui.drawer.recents.waitForVisible();
  driver.waitUntil(async () => (await this.ui.drawer.recents.nbItems) === nb);
});

Then('I can see the list of recently viewed documents has {string} document', async function(title) {
  await this.ui.drawer.recents.waitForVisible();
  const derwa = await this.ui.drawer;
  const rece = await derwa.recents;
  const member = await rece.waitForHasMember(title);
  member.should.be.true;
});
