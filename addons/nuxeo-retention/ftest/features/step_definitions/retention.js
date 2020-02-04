import { Then } from 'cucumber';

Then('I set a legal hold on the document with description {string}', function(desc) {
  this.ui.browser.clickDocumentActionMenu('nuxeo-hold-toggle-button:not([hold])');
  const dialog = this.ui.browser.el.element('nuxeo-hold-toggle-button #dialog');
  dialog.waitForVisible();
  const descInput = dialog.element('nuxeo-textarea[name="description"]');
  fixtures.layouts.setValue(descInput, desc);
  dialog.waitForEnabled('paper-button[name="hold"]');
  dialog.click('paper-button[name = "hold"]');
});

Then('I unset the legal hold on the document', function() {
  this.ui.browser.clickDocumentActionMenu('nuxeo-hold-toggle-button[hold]');
});

Then('I see the document is under legal hold', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.infoBar.waitForVisible('#retentionInfoBar #legalHold');
});

Then('I see the document is not under legal hold', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.infoBar.waitForExist('#legalHold', false);
});

Then('I can unset the legal hold on the document', function() {
  this.ui.browser.el.waitForExist('nuxeo-hold-toggle-button[hold]');
});

Then('I cannot set the legal hold on the document', function() {
  this.ui.browser.el.waitForExist('nuxeo-hold-toggle-button', false);
});

Then('I cannot unset the legal hold on the document', function() {
  this.ui.browser.el.waitForExist('nuxeo-hold-toggle-button[hold]', false);
});

Then('I cannot edit main blob', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.el.waitForExist('nuxeo-replace-blob-button', false);
  page.el.waitForExist('nuxeo-delete-blob-button', false);
});

Then('I can edit main blob', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.el.waitForExist('nuxeo-replace-blob-button');
  page.el.waitForExist('nuxeo-delete-blob-button');
});

Then('I can see the retention menu', function() {
  this.ui.drawer.waitForVisible('nuxeo-menu-icon[name="retention"]');
});

Then('I cannot see the retention menu', function() {
  this.ui.drawer.waitForNotVisible('nuxeo-menu-icon[name="retention"]');
});

Then('I go to the retention event', function() {
  const menu = this.ui.drawer.open('retention');
  return driver.waitUntil(() => {
    try {
      // XXX click sometimes hits nuxeo-browser, resulting in an error
      menu.waitForVisible('nuxeo-menu-item[name="events"]');
      menu.click('nuxeo-menu-item[name="events"]');
      return true;
    } catch (e) {
      return false;
    }
  });
});

Then('I go to the retention rules location', function() {
  const menu = this.ui.drawer.open('retention');
  return driver.waitUntil(() => {
    try {
      // XXX click sometimes hits nuxeo-browser, resulting in an error
      menu.waitForVisible('nuxeo-menu-item[name="rules"]');
      menu.click('nuxeo-menu-item[name="rules"]');
      return true;
    } catch (e) {
      return false;
    }
  });
});

Then('I attach the {string} rule to the document', function(ruleName) {
  this.ui.browser.clickDocumentActionMenu('nuxeo-attach-rule-button');
  const dialog = this.ui.browser.el.element('nuxeo-attach-rule-button #dialog');
  dialog.waitForVisible();
  const select = dialog.element('nuxeo-document-suggestion');
  fixtures.layouts.setValue(select, ruleName);
  dialog.waitForEnabled('paper-button[name="add"]');
  dialog.click('paper-button[name = "add"]');
});

Then('I see the document is under retention', function() {
  driver.waitUntil(() => {
    driver.refresh();
    const page = this.ui.browser.documentPage(this.doc.type);
    page.infoBar.waitForVisible('#retentionInfoBar #retention');
    return true;
  });
});

Then('I see the document is under indeterminate retention', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.infoBar.waitForVisible('#retentionInfoBar #indeterminateRetention');
});

Then('I have a "ContractEnd" retention event', () => {
  fixtures.vocabularies.createEntry('RetentionEvent', 'Retention.ContractEnd', {
    obsolete: 0,
    id: 'Retention.ContractEnd',
    label_en: 'Contract End',
    label_fr: 'Fin de contrat',
  });
});

Then('I fire the {string} retention event with {string} input', function(eventName, eventInput) {
  this.ui.el.waitForVisible('nuxeo-retention-events');
  const evtsElement = this.ui.el.element('nuxeo-retention-events');
  evtsElement.waitForVisible('nuxeo-directory-suggestion[name="event"]');
  evtsElement.waitForVisible('nuxeo-input[name="eventInput"]');
  const eventSelectElt = evtsElement.element('nuxeo-directory-suggestion[name="event"]');
  const eventInputElt = evtsElement.element('nuxeo-input[name="eventInput"]');
  fixtures.layouts.setValue(eventSelectElt, eventName);
  fixtures.layouts.setValue(eventInputElt, eventInput);
  evtsElement.waitForEnabled('paper-button[name="fire"]');
  evtsElement.click('paper-button[name="fire"]');
});
