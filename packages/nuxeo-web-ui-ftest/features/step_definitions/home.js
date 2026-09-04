import { Given, Then, When } from '@cucumber/cucumber';

Given('I am not on the home page', async function () {
  await this.ui.leaveHome();
});

When('I click the home button', async function () {
  await this.ui.goHome();
});

Then('I can see my home', async function () {
  const check = await this.ui.home.waitForVisible();
  check.should.be.true;
});

Then('I have a {string} card', async function (title) {
  const card = await this.ui.home.card(title);
  const visi = await card.waitForVisible();
  visi.should.be.true;
});
