// eslint-disable-next-line import/no-extraneous-dependencies
import { Then } from '@cucumber/cucumber';

async function hasRenderedThumbnails(videoViewer) {
  const thumbnails = await videoViewer.shadow$('#thumbnails');
  if (!(await thumbnails.isExisting())) {
    return false;
  }

  return driver.execute(
    (el) => Array.from(el.children).some((c) => c.offsetHeight > 0 && c.offsetWidth > 0),
    thumbnails,
  );
}

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
  const WAIT_INTERVAL = 500;
  const FIRST_WAIT_MS = 5000; // before refresh
  const SECOND_WAIT_MS = 5000; // after refresh

  console.log('Starting test for video.feature');
  let refreshed = false;
  const start = Date.now();
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

      // Phase 1: normal wait
      if (await hasRenderedThumbnails(videoViewer)) {
        console.log('Found thumbnails !!');
        return true;
      }
      // Phase 2: refresh once after timeout
      if (!refreshed && Date.now() - start > FIRST_WAIT_MS) {
        console.log('Storyboard not found, refreshing page once...');

        await driver.execute(() => Nuxeo.UI.app.refresh());
        refreshed = true;

        // Give UI time to re-bootstrap
        await driver.pause(1000);
      }

      // Phase 3: wait again after refresh
      if (refreshed && Date.now() - start > FIRST_WAIT_MS + SECOND_WAIT_MS) {
        console.log('WAITING AFTER REFRESH');
        return false;
      }

      console.log('Not found !');
      return false;
    },
    {
      interval: WAIT_INTERVAL,
      timeout: FIRST_WAIT_MS + SECOND_WAIT_MS + 2000,
      timeoutMsg: 'I cannot see the video storyboard thumbnails',
    },
  );
  /* eslint-enable no-console */
});
