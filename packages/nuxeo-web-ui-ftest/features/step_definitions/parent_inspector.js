import { Then } from '@cucumber/cucumber';

Then('I can open parent inspector information', function() {
  this.ui.browser.parentInspectorButton.waitForVisible();
  this.ui.browser.parentInspectorButton.click();
  this.ui.browser.parentInspectorDialog.waitForVisible();
});

Then('I can see dialog showing the parent inspector information for a given document', function() {
  this.ui.browser.parentInspector.title === 'Title:';
  this.ui.browser.parentInspector.path === 'Path:';
  this.ui.browser.parentInspector.uid === 'UID:';
  this.ui.browser.parentInspector.facets === 'Facets:';
  this.ui.browser.parentInspector.schema === 'Schemas:';
});

Then('I can see dialog showing partial parent inspector information for a given document', function() {
  this.ui.browser.parentInspector.title === 'Title:';
  this.ui.browser.parentInspector.path === 'Path:';
  this.ui.browser.parentInspector.facets === 'Facets:';
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.uid);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspector.schema);
});

Then('I cannot open parent inspector information', function() {
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorButton);
});
