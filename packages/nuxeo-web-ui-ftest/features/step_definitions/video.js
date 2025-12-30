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
  let refreshedOnce = false;
  console.log('Starting test for video.feature');
  await driver.waitUntil(
    async () => {
      const uiBrowser = await this.ui.browser;
      const page = await uiBrowser.documentPage(this.doc.type);

      if (!(await page.isVisible())) {
        console.error('Page is not visible yet');
        return false;
      }

      const videoViewer = await page.el.$('nuxeo-video-viewer');
      if (!(await videoViewer.isDisplayed())) {
        console.error('Viewer is not displayed yet');
        return false;
      }

      const storyboard = await videoViewer.shadow$('#storyboard');
      if (!(await storyboard.isExisting())) {
        if (!refreshedOnce) {
          refreshedOnce = true;
          console.log('Storyboard is not existing yet.. Refreshing page');
          await driver.execute(async () => Nuxeo.UI.app.refresh());
          await driver.pause(5000);
          return false;
        }
        console.warn('Storyboard is not existing yet after refresh.');
        return true;
      }
      return true;
    },
    {
      interval: 500,
      timeoutMsg: 'I cannot see the video storyboard',
    },
  );
  /* eslint-enable no-console */
});
