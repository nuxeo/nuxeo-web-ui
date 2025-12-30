// eslint-disable-next-line import/no-extraneous-dependencies
import { Then } from '@cucumber/cucumber';

Then('I can see the video conversions panel', async function() {
  const uiBrowser = await this.ui.browser;
  const page = await uiBrowser.documentPage(this.doc.type);
  await page.waitForVisible();
  const element = await page.el.$('nuxeo-video-conversions');
  const elementVisible = await element.waitForVisible();
  await elementVisible.should.be.true;
});

Then('I can see the video storyboard', async function() {
  /* eslint-disable no-console */

  console.log('Starting test for video.feature');
  await driver.waitUntil(
    async () => {
      const uiBrowser = await this.ui.browser;
      const page = await uiBrowser.documentPage(this.doc.type);

      if (!(await page.isVisible())) {
        console.log('Page is not visible yet');
        return false;
      }

      const videoViewer = await page.el.$('nuxeo-video-viewer');
      if (!(await videoViewer.isDisplayed())) {
        console.log('Viewer is not displayed yet');
        return false;
      }

      const storyboard = await videoViewer.shadow$('#storyboard');
      if (!(await storyboard.isExisting())) {
        console.log('Storyboard is not existing yet.. Refreshing page');
        await driver.execute(async () => Nuxeo.UI.app.refresh());
        await driver.pause(2000);
        return false;
      }

      return true;
    },
    {
      interval: 500,
      timeout: 30000,
      timeoutMsg: 'I cannot see the video storyboard thumbnails',
    },
  );
  /* eslint-enable no-console */
});
