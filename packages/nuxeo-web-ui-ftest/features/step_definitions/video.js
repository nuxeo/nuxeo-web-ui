import { Then } from '@cucumber/cucumber';

Then('I can see the video conversions panel', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.el.element('nuxeo-video-conversions').waitForVisible().should.be.true;
});

Then('I can see the video storyboard', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  const videoViewer = page.el.element('nuxeo-video-viewer');
  videoViewer.waitForVisible();
  videoViewer.element('#storyboard').waitForVisible().should.be.true;
});
