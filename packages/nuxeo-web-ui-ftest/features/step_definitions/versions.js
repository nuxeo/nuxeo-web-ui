import { When } from '../../node_modules/@cucumber/cucumber';

When(/^I can see the version info bar with text "(.*)"$/, async function(text) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const versionInfoBar = await page.versionInfoBar;
  await versionInfoBar.waitForVisible();
  const versionInfoBarText = await versionInfoBar.getText();
  versionInfoBarText.should.equal(text);
});

When(/^The document is unversioned$/, async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const createVersionBtn = await page.versions.createVersionButton;
  await createVersionBtn.waitForVisible();
});

When(/^I click the Create Version button$/, async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const createVersionBtn = await page.versions.createVersionButton;
  await createVersionBtn.waitForVisible();
  await createVersionBtn.click();
});

When(/^The create version dialog appears$/, async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const pageVersionDialog = await page.versions.dialog;
  await pageVersionDialog.waitForVisible();
  await pageVersionDialog.waitForVisible('paper-button[dialog-dismiss]');
  await pageVersionDialog.waitForVisible('paper-button[dialog-confirm]');
});

When(/^Version options (\d+)\.(\d+) and (\d+)\.(\d+) are presented$/, async function(v1, v2, v3, v4) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const pageVersionDialog = await page.versions.dialog;
  await pageVersionDialog.waitForVisible();
  const dialogMinor = await page.versions.dialogNextMinor;
  const dialogMinorText = await dialogMinor.getText();
  dialogMinorText.should.equal(`${v1}.${v2}`);
  const dialogMajor = await page.versions.dialogNextMajor;
  const dialogMajorText = await dialogMajor.getText();
  dialogMajorText.should.equal(`${v3}.${v4}`);
});

When(/^I create a (major|minor) version$/, async function(versionType) {
  const page = await this.ui.browser.documentPage(this.doc.type);
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

When(/^The document version is ([^"]*)$/, async function(label) {
  await driver.pause(1000);
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  await page.versions.waitForVisible();
  const versionsToggle = await page.versions.toggle;
  await versionsToggle.waitForVisible();
  const versionsToggleText = await versionsToggle.getText();
  if (versionsToggleText !== label) {
    throw Error(`No version found with label "${label}"`);
  }
});

When(/^I click the versions list$/, async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const versions = await page.versions;
  await versions.waitForVisible();
  const versionsToggle = await versions.toggle;
  await versionsToggle.waitForVisible();
  await versionsToggle.click();
  const versionsListItems = await versions.listItems;
  await versionsListItems.waitForVisible();
});

When(/^I click the versions list at index (\d+)$/, async function(index) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const versions = await page.versions;
  await versions.waitForVisible();
  await versions.listItem(index).waitForExist();
  await versions.listItems.waitForVisible();
  await versions.listItem(index).waitForExist();
  await versions.listItem(index).waitForVisible();
  await versions.listItem(index).click();
});

When(/^Versions item index at (\d+) is ([^"]*)$/, async function(index, text) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const versions = await page.versions;
  await versions.waitForVisible();
  const listItemTitle = await versions.listItemTitle(index);
  const listItemTitleText = await listItemTitle.getText();
  listItemTitleText.should.equals(text);
});

When(/^Versions count is (\d+)$/, async function(count) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const versions = await page.versions;
  await versions.waitForVisible();
  const listCount = await versions.listCount;
  listCount.should.equal(count);
});

When(/^I click the Create Version button in versions list$/, async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const versions = await page.versions;
  await versions.waitForVisible();
  await versions.listItems.waitForVisible();
  const listCreateVersionButton = await versions.listCreateVersionButton;
  await listCreateVersionButton.waitForVisible();
  await listCreateVersionButton.click();
});

When(/^I can restore version$/, async function() {
  const page = await this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  const restoreVersionButton = await page.restoreVersionButton;
  await restoreVersionButton.waitForVisible();
  await restoreVersionButton.click();
  const restoreVersionButtonConfirm = await page.restoreVersionButtonConfirm;
  await restoreVersionButtonConfirm.waitForVisible();
  await restoreVersionButtonConfirm.click();
});
