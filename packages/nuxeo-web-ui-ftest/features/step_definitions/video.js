import { Then } from '@cucumber/cucumber';

Then('I can see the video conversions panel', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.el.element('nuxeo-video-conversions').waitForVisible().should.be.true;
});

Then('I can see the video storyboard', function() {
  driver.waitUntil(() => {
    const page = this.ui.browser.documentPage(this.doc.type);
    if (!page.isVisible()) {
      return false;
    }
    const videoViewer = page.el.element('nuxeo-video-viewer');
    if (!videoViewer.isVisible()) {
      return false;
    }
    if (videoViewer.element('#storyboard').isVisible() !== true) {
      driver.execute(() => Nuxeo.UI.app.refresh());
      driver.pause(1000);
      return false;
    }
    return true;
  });
});
