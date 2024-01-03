import { When } from '../../node_modules/@cucumber/cucumber';

When(/^I can see the version info bar with text "(.*)"$/, function(text) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versionInfoBar.waitForVisible();
  page.versionInfoBar.getText().should.equal(text);
});

When(/^The document is unversioned$/, async function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const createVersionBtn = await page.versions.createVersionButton;
  await createVersionBtn.waitForVisible();
});

When(/^I click the Create Version button$/, async function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const createVersionBtn = await page.versions.createVersionButton;
  await createVersionBtn.waitForVisible();
  await createVersionBtn.click();
});

When(/^The create version dialog appears$/, async function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const pageVersionDialog = await page.versions.dialog;
  await pageVersionDialog.waitForVisible();
  await pageVersionDialog.waitForVisible('paper-button[dialog-dismiss]');
  await pageVersionDialog.waitForVisible('paper-button[dialog-confirm]');
});

When(/^Version options (\d+)\.(\d+) and (\d+)\.(\d+) are presented$/, function(v1, v2, v3, v4) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.versions.waitForVisible();
  page.versions.dialog.waitForVisible();
  page.versions.dialogNextMinor.getText().should.equal(`${v1}.${v2}`);
  page.versions.dialogNextMajor.getText().should.equal(`${v3}.${v4}`);
});

When(/^I create a (major|minor) version$/, async function(versionType) {
  const page = this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const pageVersionDialog = await page.versions.dialog;
  await pageVersionDialog.waitForVisible();
  switch (versionType) {
    case 'major': {
      const dialogMajorOpt = await page.versions.dialogMajorOption;
      await dialogMajorOpt.click();
      break;
    }
    case 'minor': {
      const dialogMinorOpt = await page.versions.dialogMinorOption;
      await dialogMinorOpt.click();
      break;
    }
    default:
    // do nothing
  }
  const dialogConfirmBtn = await page.versions.dialogConfirmButton;
  await dialogConfirmBtn.waitForVisible();
  await dialogConfirmBtn.click();
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
