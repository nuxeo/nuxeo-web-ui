'use strict';

module.exports = function () {
  this.When(/^I can see the version info bar with text "(.*)"$/, (text) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versionInfoBar.waitForVisible();
    page.versionInfoBar.getText().should.equal(text);
  });

  this.When(/^The document is unversioned$/, () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.createVersionButton.waitForVisible();
  });

  this.When(/^I click the Create Version button$/, () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.createVersionButton.waitForVisible();
    page.versions.createVersionButton.click();
  });

  this.When(/^The create version dialog appears$/, () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();
    page.versions.dialogDismissButton.waitForVisible();
    page.versions.dialogConfirmButton.waitForVisible();
  });

  this.When(/^Version options (\d+)\.(\d+) and (\d+)\.(\d+) are presented$/, (v1, v2, v3, v4) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();
    page.versions.dialogNextMinor.getText().should.equal(`${v1}.${v2}`);
    page.versions.dialogNextMajor.getText().should.equal(`${v3}.${v4}`);
  });

  this.When(/^I create a (major|minor) version$/, (versionType) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.dialog.waitForVisible();
    switch (versionType) {
      case 'major':
        page.versions.dialogMajorOption.click();
        break;
      case 'minor':
        page.versions.dialogMinorOption.click();
        break;
      default:
        // do nothing
    }
    page.versions.dialogConfirmButton.waitForVisible();
    page.versions.dialogConfirmButton.click();
  });

  this.When(/^The document version is ([^"]*)$/, (label) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    // wait for invisible
    page.versions.createVersionButton.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
    page.versions.toggle.waitForVisible();
    page.versions.toggle.getText().should.equals(label);
  });

  this.When(/^I click the versions list$/, () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.toggle.waitForVisible();
    page.versions.toggle.click();
    page.versions.listItems.waitForVisible();
  });

  this.When(/^I click the versions list at index (\d+)$/, (index) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.listItem(index).waitForExist();
    page.versions.listItems.waitForVisible();
    page.versions.listItem(index).waitForExist();
    page.versions.listItem(index).waitForVisible();
    page.versions.listItem(index).click();
  });

  this.When(/^Versions item index at (\d+) is ([^"]*)$/, (index, text) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.listItemTitle(index).getText().should.equals(text);
  });

  this.When(/^Versions count is (\d+)$/, (count) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.listCount.should.equal(parseInt(count));
  });

  this.When(/^I click the Create Version button in versions list$/, () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.versions.waitForVisible();
    page.versions.listItems.waitForVisible();
    page.versions.listCreateVersionButton.waitForVisible();
    page.versions.listCreateVersionButton.click();
  });

  this.When(/^I can restore version$/, () => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.waitForVisible();
    page.restoreVersionButton.waitForVisible();
    page.restoreVersionButton.click();
    page.restoreVersionButtonConfirm.waitForVisible();
    page.restoreVersionButtonConfirm.click();
  });
};
