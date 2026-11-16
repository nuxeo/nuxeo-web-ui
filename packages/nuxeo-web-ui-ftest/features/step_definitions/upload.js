import { Then, When } from '@cucumber/cucumber';

Then(/^I upload file "(.+)" as document content/, async function (file) {
  const element = await this.ui.browser.el.element('nuxeo-dropzone');
  await fixtures.layouts.setValue(element, file);
});

// `chooseFile` drives the hidden file input, which can only ever carry one file on a single blob
// dropzone. Dropping is the only way to hand the widget several files at once, so synthesise the
// drag and drop in the page.
When(/^I drop (\d+) files? at once as document content$/, async function (count) {
  const element = await this.ui.browser.el.element('nuxeo-dropzone');
  await element.waitForVisible();
  await browser.execute(
    (dropzone, total) => {
      const dataTransfer = new DataTransfer();
      for (let i = 0; i < total; i++) {
        dataTransfer.items.add(new File([`content ${i}`], `dropped-${i}.txt`, { type: 'text/plain' }));
      }
      dropzone.shadowRoot
        .querySelector('#dropzone')
        .dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    },
    element,
    Number(count),
  );
});

Then('I can see an error on the document content dropzone', async function () {
  const element = await this.ui.browser.el.element('nuxeo-dropzone');
  await element.waitForVisible();
  const invalid = await browser.execute((dropzone) => dropzone.invalid === true, element);
  invalid.should.be.true;
});

Then('I can see the blob replace button', async function () {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const ele = await view.el.element('nuxeo-replace-blob-button');
  const result = await ele.waitForVisible();
  result.should.be.true;
});

Then("I can't see the blob replace button", async function () {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const ele = await view.el.element('nuxeo-replace-blob-button');
  // The button is rendered but zero sized when the user cannot write, and absent altogether when
  // the document has no main blob, so it has to be found before it can be measured.
  const isVisible = (await ele.isExisting()) && (await view.isTrulyVisible(ele));
  isVisible.should.be.false;
});

Then('I can see the option to add new attachments', async function () {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const metadata = await page.metadata;
  await metadata.waitForVisible();
  const ele = await metadata.el.element('nuxeo-dropzone');
  const result = await ele.waitForVisible();
  result.should.be.true;
});

Then("I can't see the option to add new attachments", async function () {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const metadata = await page.metadata;
  await metadata.waitForVisible();
  const result = await metadata.waitForNotVisible('nuxeo-dropzone');
  result.should.be.true;
});

Then('I can see the option to add a main blob', async function () {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const ele = await view.el.element('nuxeo-dropzone');
  const result = await ele.waitForVisible();
  result.should.be.true;
});

Then("I can't see the option to add a main blob", async function () {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const view = await page.view;
  await view.waitForVisible();
  const result = await view.waitForNotVisible('nuxeo-dropzone');
  result.should.be.true;
});
