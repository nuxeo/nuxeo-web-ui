import { Then } from '@cucumber/cucumber';

Then('I can see parent inspector icon and click on it', function() {
  this.ui.browser.parentInspectorButton.waitForVisible();
  this.ui.browser.parentInspectorButton.click();
  this.ui.browser.parentInspectorDialog.waitForVisible();
});

Then('I can close the parent inspector dialog box', function() {
  this.ui.browser.parentInspector.parentInspectorClose.click();
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorDialog);
});

Then('I can see parent inspector dialog opened', function() {
  this.ui.browser.parentInspector.title.waitForDisplayed();
  this.ui.browser.parentInspector.path.waitForDisplayed();
  this.ui.browser.parentInspector.uid.waitForDisplayed();
  this.ui.browser.parentInspector.facets.waitForDisplayed();
  this.ui.browser.parentInspector.schema.waitForDisplayed();
});

Then('I can see parent inspector dialog opened with partial parent inspector information', function() {
  this.ui.browser.parentInspector.title.waitForDisplayed();
  this.ui.browser.parentInspector.path.waitForDisplayed();
  this.ui.browser.parentInspector.facets.waitForDisplayed();
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.uid);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.schema);
});

Then('I cannot see parent inspector icon', function() {
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorButton);
});
