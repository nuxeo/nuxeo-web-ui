'use strict';

import CreateDialog from './ui/create_dialog';
import NavButtons from './ui/nav_buttons';
import EditDoc from './ui/edit_doc';

export default class UI {

  constructor() {
    this.home = new NavButtons('nuxeo-home');
    this.browser = new NavButtons('section.browse');
    this.search = new NavButtons('section.search');
    this.admin = new NavButtons('section.administration');
    this.recents = new NavButtons('section.recents');
    this.tasks = new NavButtons('section.tasks');
    this.favorites = new NavButtons('section.favorites');
    this.collections = new NavButtons('section.collections');
    this.personal = new NavButtons('section.personal-space');
    this.edit_doc = new EditDoc('nuxeo-document-edit paper-card #form');
  }

  goTo(button) {
    driver.click(`nuxeo-menu-icon[name='${button}']`);
  }

  goToSearch(button) {
    driver.click(`nuxeo-menu-icon[name='${button}Search']`);
  }

  goHome() {
    driver.click('paper-icon-button.logo');
  }

  goToBrowser() {
    driver.click(`nuxeo-menu-icon[icon="icons:folder-open"]`);
  }

  openCreateDocDialog() {
    driver.click('#createBtn');
  }

  get createDialog() {
    return new CreateDialog('#createDocDialog');
  }

  static get() {
    driver.url('/ui');
    driver.waitForExist('nuxeo-app', 2000);
    return new UI();
  }

  title(docType) {
    const doctype = docType.toLowerCase();
    if (doctype === 'picture') {
      driver.waitForVisible('input.nuxeo-file-edit', 2000);
      driver.setValue(`input.nuxeo-file-edit`, `Test_${docType}`);
    } else {
    driver.waitForVisible(`input.nuxeo-${doctype}-edit`, 2000);
    driver.setValue(`input.nuxeo-${doctype}-edit`, `Test_${docType}`);
    }
  }

  preview(docType) {
    driver.waitForVisible(`//nuxeo-breadcrumb/div/a/span[text()="Test_${docType}"]`, 2000);
    return driver.element(`//nuxeo-breadcrumb/div/a/span[text()="Test_${docType}"]`);
    ////nuxeo-breadcrumb/div/a/span[text()="Test_${docType}"]
    // if (doctype === 'workspace' || doctype === 'folder') {
    //   driver.waitForVisible('#dropzone', 1000);
    //   return driver.element('#dropzone');
    // } else {
    // driver.waitForVisible('#document-view', 1000);
    // return driver.element(`#document-view nuxeo-${doctype}-view`);
    // }
  }

  view(option) {
    const selection = option.toLowerCase();
    const dropdown = driver.element('paper-toolbar paper-dropdown-menu #menuButton');
    dropdown.click('#trigger');
    dropdown.waitForVisible('#dropdown');
    dropdown.click(`#dropdown #contentWrapper div paper-menu div paper-icon-item[name="${selection}"]`);
  }
}
