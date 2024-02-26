// eslint-disable-next-line import/no-extraneous-dependencies
import { Then } from '@cucumber/cucumber';

Then('I can see the picture formats panel', async function() {
  const uiBrowser = await this.ui.browser;
  const page = await uiBrowser.documentPage(this.doc.type);
  await page.waitForVisible();
  const additionalPage = await page.el.element('.additional');
  await additionalPage.waitForVisible();
  const pageElement = await additionalPage.waitForVisible('nuxeo-picture-formats');
  await pageElement.should.be.true;
});
