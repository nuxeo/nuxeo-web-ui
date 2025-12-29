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
      /* eslint-disable no-console */
      if (!(await page.isVisible())) {
        console.log('Page is not visible yet');
        return false;
      }
      const videoViewer = await page.el.$('nuxeo-video-viewer');
      if (!(await videoViewer.isDisplayed())) {
        console.log('Viewer is not displayed yet');
        return false;
      }

      const shadowRoot = await videoViewer.shadow$('div#container');
      const storyBoard = await shadowRoot.$('#storyboard');

      return storyBoard.isDisplayed();
      /* eslint-enable no-console */
    },
    {
      interval: 500,
      timeoutMsg: 'I cannot see the video storyboard',
    },
  );
});
