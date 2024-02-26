import { Then, When } from '@cucumber/cucumber';

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
  const drawer = await this.ui.drawer;
  const recents = await drawer.recents;
  await recents.waitForVisible();
  const item = await recents.nbItems;
  if (item !== nb) {
    throw new Error(`Expected count of ${nb} but found ${item}`);
  }
});

Then('I can see the list of recently viewed documents has {string} document', async function(title) {
  const drawer = await this.ui.drawer;
  const recents = await drawer.recents;
  await recents.waitForVisible();
  const member = await recents.waitForHasMember(title);
  member.should.be.true;
});
