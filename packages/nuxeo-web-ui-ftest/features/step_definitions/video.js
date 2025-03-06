// eslint-disable-next-line import/no-extraneous-dependencies
import { Then, When } from '@cucumber/cucumber';

Then('I can see the video conversions panel', async function() {
  const uiBrowser = await this.ui.browser;
  const page = await uiBrowser.documentPage(this.doc.type);
  page.waitForVisible();
  const element = await page.el.$('nuxeo-video-conversions');
  const elementVisible = await element.waitForVisible();
  await elementVisible.should.be.true;
});

Then('I can see the video storyboard', async function() {
  driver.waitUntil(
    async () => {
      const uiBrowser = await this.ui.browser;
      const page = await uiBrowser.documentPage(this.doc.type);
      if (!page.isVisible()) {
        return false;
      }
      const videoViewer = await page.el.element('nuxeo-video-viewer');
      if (!videoViewer.isVisible()) {
        return false;
      }
      const storyBoard = await videoViewer.element('#storyboard');
      const boardVisible = await storyBoard.isVisible();
      if (boardVisible !== true) {
        await driver.execute(async () => Nuxeo.UI.app.refresh());
        await driver.pause(1000);
        return false;
      }
      return true;
    },
    {
      timeoutMsg: 'I cannot see the video storyboard',
    },
  );
});

When('I can edit the following properties in the Video metadata:', async function(table) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();

  // Wait for metadata card to be visible and enabled
  const metadata = await page.metadata;
  await metadata.waitForVisible();
  await driver.waitUntil(
    async () => {
      const isVisible = await metadata.isVisible();
      const isEnabled = await metadata.isEnabled();
      return isVisible && isEnabled;
    },
    {
      timeout: 30000,
      timeoutMsg: 'Metadata form not ready for editing',
    },
  );

  // Edit the properties with increased timeout
  await metadata.editItems(table.rows(), 30000);
});
