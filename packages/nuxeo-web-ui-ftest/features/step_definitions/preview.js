import { Then, When } from '../../node_modules/@cucumber/cucumber';

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

Then(/^I can see the inline ([-\w]+) previewer$/, async function(viewerType) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.view.waitForVisible();
  await page;
  const viewEle = await page.view;
  const preview = await viewEle.preview;
  await preview.waitForVisible();

  if (viewerType === 'plain') {
    preview.waitForVisible(`#${viewerType}`);

    return;
  }
  await preview.waitForVisible(viewerType);
});

Then(/^I can see a ([-\w]+) previewer$/, (viewerType) => {
  $(`#dialog ${viewerType}`).waitForVisible();
});
