import { Then } from '@cucumber/cucumber';

Then(/^I upload file "(.+)" as document content/, async function(file) {
  const element = await this.ui.browser.el.element('nuxeo-dropzone');
  await fixtures.layouts.setValue(element, file);
});

Then('I can see the blob replace button', async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const ele = await view.el.element('nuxeo-replace-blob-button');
  const result = await ele.waitForVisible();
  result.should.be.true;
});

Then("I can't see the blob replace button", async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const ele = await view.el.element('nuxeo-replace-blob-button');
  const result = await ele.waitForVisible(5000, true);
  result.should.be.true;
});

Then('I can see the option to add new attachments', async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const metadata = await page.metadata;
  await metadata.waitForVisible();
  const ele = await metadata.el.element('nuxeo-dropzone');
  const result = await ele.waitForVisible();
  result.should.be.true;
});

Then("I can't see the option to add new attachments", async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const metadata = await page.metadata;
  await metadata.waitForVisible();
  const result = await metadata.waitForNotVisible('nuxeo-dropzone');
  result.should.be.true;
});

Then('I can see the option to add a main blob', async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const ele = await view.el.element('nuxeo-dropzone');
  const result = await ele.waitForVisible();
  result.should.be.true;
});

Then("I can't see the option to add a main blob", async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const result = await view.waitForNotVisible('nuxeo-dropzone');
  result.should.be.true;
});
