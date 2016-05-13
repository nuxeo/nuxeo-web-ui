'use strict';

import NavButtons from './ui/nav_buttons';

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
    this.createDialog = new IsVisible('paper-dialog.nuxeo-document-create-button');
    this.createFile = new IsVisible('nuxeo-file-edit');
    // this.createNote = new IsVisible('nuxeo-note-edit');
    // this.createPicture = new IsVisible('nuxeo-picture-edit');
    // this.createFolder = new IsVisible('nuxeo-folder-edit');
    // this.createWorkspace = new IsVisible('nuxeo-workspace-edit');
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
    driver.click('paper-fab.nuxeo-document-create-button');
  }

  selectDocType(docType) {
    driver.click('paper-dropdown-menu.nuxeo-document-create-button paper-menu-button');
    driver.waitUntil(function() {
      return driver.isVisible('#createDocDialog paper-dropdown-menu[label="Document type"] paper-item') ;
    });
    //driver.click(`paper-menu div paper-item='${docType}'`);
  }

  static get() {
    driver.url('/ui');
    driver.waitForExist('nuxeo-app');
    return new UI();
  }

}
