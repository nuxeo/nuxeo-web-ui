'use strict';

module.exports = function () {
  this.When('I click the preview button', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.previewButton.waitForVisible();
    page.previewButton.click();
  });

  this.When('I click the preview button for the attachment', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.view.attachments.waitForVisible();
    page.view.attachments.previewButton.click();
  });

  this.Then(/^I can see the inline ([-\w]+) previewer$/, (viewerType) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.view.waitForVisible();
    const preview = page.view.preview;
    preview.waitForVisible();
    preview.element(viewerType).waitForVisible();
  });

  this.Then(/^I can see a ([-\w]+) previewer$/, (viewerType) => {
    driver.waitForVisible(`#dialog ${viewerType}`);
  });
};
