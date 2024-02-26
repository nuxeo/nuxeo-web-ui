import { Then, When } from '@cucumber/cucumber';

When('I click the Nuxeo logo', async function() {
  const home = await this.ui.goHome();
  return home;
});

Then('I can see my home', async function() {
  const check = await this.ui.home.waitForVisible();
  check.should.be.true;
});

Then('I have a {string} card', async function(title) {
  const card = await this.ui.home.card(title);
  const visi = await card.waitForVisible();
  visi.should.be.true;
});
