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

Then('I can see parent inspector dialog opened with parent inspector information', function() {
  this.ui.browser.parentInspector.title === 'Title:';
  this.ui.browser.parentInspector.titleValue.waitForDisplayed();
  this.ui.browser.parentInspector.path === 'Path:';
  this.ui.browser.parentInspector.pathValue.waitForDisplayed();
  this.ui.browser.parentInspector.uid === 'UID:';
  this.ui.browser.parentInspector.uidValue.waitForDisplayed();
  this.ui.browser.parentInspector.facets === 'Facets:';
  this.ui.browser.parentInspector.facetsValue.waitForDisplayed();
  this.ui.browser.parentInspector.schema === 'Schemas:';
  this.ui.browser.parentInspector.schemaValue.waitForDisplayed();
});

Then('I can see parent inspector dialog opened with partial parent inspector information', function() {
  this.ui.browser.parentInspector.title === 'Title:';
  this.ui.browser.parentInspector.titleValue.waitForDisplayed();
  this.ui.browser.parentInspector.path === 'Path:';
  this.ui.browser.parentInspector.pathValue.waitForDisplayed();
  this.ui.browser.parentInspector.facets === 'Facets:';
  this.ui.browser.parentInspector.facetsValue.waitForDisplayed();
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.uid);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.uidValue);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.schema);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.schemaValue);
});

Then('I cannot see parent inspector icon', function() {
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorButton);
});
