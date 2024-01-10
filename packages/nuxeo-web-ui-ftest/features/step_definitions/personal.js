import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I can see my personal workspace', async function() {
  const personalEle = await this.ui.drawer.personal;
  await personalEle.waitForVisible();
  if (!personalEle) {
    throw new Error(`Expected my personal workspace not be visible`);
  }
});
