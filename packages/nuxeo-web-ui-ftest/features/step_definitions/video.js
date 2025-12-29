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
  await driver.waitUntil(
    async () => {
      const uiBrowser = await this.ui.browser;
      const page = await uiBrowser.documentPage(this.doc.type);
      if (!(await page.isVisible())) {
        return false;
      }
      const videoViewer = await page.el.$('nuxeo-video-viewer');
      if (!(await videoViewer.isDisplayed())) {
        return false;
      }
      const storyBoard = await videoViewer.$('#storyboard');
      if (!(await storyBoard.isExisting())) {
        return false;
      }
      const { height } = await storyBoard.getSize();
      return height > 0;
    },
    {
      interval: 500,
      timeoutMsg: 'I cannot see the video storyboard',
    },
  );
});
