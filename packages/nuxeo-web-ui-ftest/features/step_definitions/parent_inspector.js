import { Then } from '@cucumber/cucumber';
import pause from 'webdriverio/build/commands/browser/pause';

Then('I can open current document information', function() {
  this.ui.browser.parentInspectorButton.waitForVisible();
  this.ui.browser.parentInspectorButton.click();
  this.ui.browser.parentInspectorDialog.waitForVisible();
});

Then('I can see dialog showing the information for a given document', function() {
  this.ui.browser.parentInspectorDataTitle === 'Title:';
  this.ui.browser.parentInspectorDataPath === 'Path:';
  this.ui.browser.parentInspectorDataUID === 'UID:';
  this.ui.browser.parentInspectorDataFacets === 'Facets:';
  this.ui.browser.parentInspectorDataSchema === 'Schemas:';
});

Then('I can see dialog showing some information for a given document', function() {
  this.ui.browser.parentInspectorDataTitle === 'Title:';
  this.ui.browser.parentInspectorDataPath === 'Path:';
  this.ui.browser.parentInspectorDataFacets === 'Facets:';
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorDataUID);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorDataSchema);
});

Then('I can close the parent inspector dialog box', function() {
  this.ui.browser.parentInspectorClose.click();
  pause(2000);
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorDialog);
});

Then('I cannot open current document information', function() {
  this.ui.browser.waitForNotVisible(this.ui.browser.parentInspectorButton);
});
