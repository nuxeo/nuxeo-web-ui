import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I can see the picture formats panel', async function() {
  const uiBrowser = await this.ui.browser;
  const page = await uiBrowser.documentPage(this.doc.type);
  await page.waitForVisible();
  const additionalPage = await page.el.$('.additional');
  await additionalPage.waitForVisible();
  const pageElement = await additionalPage.$('nuxeo-picture-formats');
  const element = await pageElement.waitForVisible();
  await element.should.be.true;
});
