// eslint-disable-next-line import/no-extraneous-dependencies
import { Then } from '@cucumber/cucumber';

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
