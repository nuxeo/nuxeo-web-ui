import { Then } from '@cucumber/cucumber';

Then(/^I upload file "(.+)" as document content/, function(file) {
  return fixtures.layouts.setValue(this.ui.browser.el.element('nuxeo-dropzone'), file);
});

Then('I can see the blob replace button', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.view.waitForVisible();
  page.view.waitForVisible('nuxeo-replace-blob-button').should.be.true;
});

Then("I can't see the blob replace button", function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.view.waitForVisible();
  page.view.el.element('nuxeo-replace-blob-button').waitForVisible(browser.options.waitforTimeout, true).should.be.true;
});

Then('I can see the option to add new attachments', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.metadata.waitForVisible();
  page.metadata.waitForVisible('nuxeo-dropzone').should.be.true;
});

Then("I can't see the option to add new attachments", function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.metadata.waitForVisible();
  page.metadata.waitForNotVisible('nuxeo-dropzone').should.be.true;
});

Then('I can see the option to add a main blob', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.view.waitForVisible();
  page.view.waitForVisible('nuxeo-dropzone').should.be.true;
});

Then("I can't see the option to add a main blob", function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.view.waitForVisible();
  page.view.waitForNotVisible('nuxeo-dropzone').should.be.true;
});
