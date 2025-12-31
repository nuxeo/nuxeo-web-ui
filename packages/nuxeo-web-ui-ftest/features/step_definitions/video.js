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
  let refreshedOnce = false;
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

      const storyboard = await videoViewer.shadow$('#storyboard');
      if (!(await storyboard.isExisting())) {
        if (!refreshedOnce) {
          refreshedOnce = true;
          await driver.execute(async () => Nuxeo.UI.app.refresh());
          await driver.pause(5000);
          return false;
        }
        console.warn('Storyboard is not existing yet even after refreshing page.');
        return true;
      }
      return true;
    },
    {
      interval: 500,
      timeoutMsg: 'I cannot see the video storyboard',
    },
  );
});
