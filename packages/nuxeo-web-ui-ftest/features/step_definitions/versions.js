import { When } from '@cucumber/cucumber';

When(/^I can see the version info bar with text "(.*)"$/, function(text) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versionInfoBar.waitForVisible();
  page.versionInfoBar.getText().should.equal(text);
});

When(/^The document is unversioned$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.createVersionButton.waitForVisible();
});

When(/^I click the Create Version button$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.createVersionButton.waitForVisible();
  page.versions.createVersionButton.click();
});

When(/^The create version dialog appears$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.dialog.waitForVisible();
  page.versions.dialog.waitForVisible('paper-button[dialog-dismiss]');
  page.versions.dialog.waitForVisible('paper-button[dialog-confirm]');
});

When(/^Version options (\d+)\.(\d+) and (\d+)\.(\d+) are presented$/, function(v1, v2, v3, v4) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.dialog.waitForVisible();
  page.versions.dialogNextMinor.getText().should.equal(`${v1}.${v2}`);
  page.versions.dialogNextMajor.getText().should.equal(`${v3}.${v4}`);
});

When(/^I create a (major|minor) version$/, function(versionType) {
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

When(/^The document version is ([^"]*)$/, function(label) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.toggle.waitForVisible();
  driver.waitUntil(() => page.versions.toggle.getText() === label, `No version found with label "${label}"`);
});

When(/^I click the versions list$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.toggle.waitForVisible();
  page.versions.toggle.click();
  page.versions.listItems.waitForVisible();
});

When(/^I click the versions list at index (\d+)$/, function(index) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.listItem(index).waitForExist();
  page.versions.listItems.waitForVisible();
  page.versions.listItem(index).waitForExist();
  page.versions.listItem(index).waitForVisible();
  page.versions.listItem(index).click();
});

When(/^Versions item index at (\d+) is ([^"]*)$/, function(index, text) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions
    .listItemTitle(index)
    .getText()
    .should.equals(text);
});

When(/^Versions count is (\d+)$/, function(count) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.listCount.should.equal(count);
});

When(/^I click the Create Version button in versions list$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.listItems.waitForVisible();
  page.versions.listCreateVersionButton.waitForVisible();
  page.versions.listCreateVersionButton.click();
});

When(/^I can restore version$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.restoreVersionButton.waitForVisible();
  page.restoreVersionButton.click();
  page.restoreVersionButtonConfirm.waitForVisible();
  page.restoreVersionButtonConfirm.click();
});
