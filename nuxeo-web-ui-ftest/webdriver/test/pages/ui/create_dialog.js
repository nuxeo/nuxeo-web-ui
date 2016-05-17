'use strict';

export default class CreateDialog {

  constructor(selector) {
    this.dialog = driver.element(selector);
  }

  get isVisible() {
    return this.dialog.isVisible();
  }

  set docType(docType) {
    const dropdown = this.dialog.element('paper-dropdown-menu[label="Document type"]');
    dropdown.waitForVisible('paper-dropdown-menu[label="Document type"]');
    dropdown.waitForVisible('#menuButton #trigger paper-input paper-input-container div div input');
    dropdown.click('#menuButton #trigger paper-input paper-input-container div div input');
    dropdown.waitForVisible('#menuButton #dropdown #contentWrapper div.dropdown-content paper-menu div.selectable-content');
    driver.pause(1000);
    dropdown.click(`//paper-menu-button/iron-dropdown/div/div/paper-menu/div/paper-item[text()="${docType}"]`);
    const doctype = docType.toLowerCase();
    this.dialog.waitForVisible(`#form nuxeo-${doctype}-edit`, 5000);
  }

  form(docType) {
    const doctype = docType.toLowerCase();
    return this.dialog.element(`#form nuxeo-${doctype}-edit`);
  }

  submit() {
    this.dialog.element('paper-button.primary').click();
  }
}
