'use strict';

module.exports = function() {

  this.When('The document is unversioned', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.createVersionButton.waitForVisible();
  });

  this.When('I click the Create Version button', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.createVersionButton.waitForVisible();
    page.versions.createVersionButton.click();
  });

  this.When('The create version dialog appears', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();
  });

  this.When(/^Version options (\d+)\.(\d+) and (\d+)\.(\d+) are presented$/, (v1, v2, v3, v4) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();
    let nextMinor = v1 + '.' + v2;
    page.versions.checkDialogVersion('minor', nextMinor);
    let nextMajor = v3 + '.' + v4;
    page.versions.checkDialogVersion('major', nextMajor);
  });

  this.When('I can cancel the dialog', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();

  });

  this.When('Dialog dismiss and confirm buttons are available', () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();
    page.versions.checkDialogButtons().should.be.true;
  });

};
