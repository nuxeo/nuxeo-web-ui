import { Then, When } from '../../node_modules/@cucumber/cucumber';

When('I click the preview button', async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const buttonEle = await page.previewButton;
  await buttonEle.waitForVisible();
  await buttonEle.click();
});

When('I click the preview button for the attachment', async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const attachEle = await page.metadata.attachments;
  await attachEle.waitForVisible();
  const buttonEle = await attachEle.previewButton;
  await buttonEle.click();
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
