import { Then, When } from '@cucumber/cucumber';

When('I click the preview button', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.previewButton.waitForVisible();
  page.previewButton.click();
});

When('I click the preview button for the attachment', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.metadata.attachments.waitForVisible();
  page.metadata.attachments.previewButton.click();
});

Then(/^I can see the inline ([-\w]+) previewer$/, function(viewerType) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.view.waitForVisible();
  const { preview } = page.view;
  preview.waitForVisible();
  preview.waitForVisible(viewerType);
});

Then(/^I can see a ([-\w]+) previewer$/, (viewerType) => {
  $(`#dialog ${viewerType}`).waitForVisible();
});
