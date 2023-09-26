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
  const uiBrowser = await this.ui.browser;
  const page = await uiBrowser.documentPage(this.doc.type);
  await page.waitForVisible();
  const pageView = await page.view;
  await pageView.waitForVisible();
  const preview = await pageView.preview;
  await preview.waitForVisible();
  if (viewerType === 'plain') {
    await preview.waitForVisible(`#${viewerType}`);
    return;
  }
  await preview.waitForVisible(viewerType);
});

Then(/^I can see a ([-\w]+) previewer$/, async (viewerType) => {
  await $(`#dialog ${viewerType}`).waitForVisible();
});
