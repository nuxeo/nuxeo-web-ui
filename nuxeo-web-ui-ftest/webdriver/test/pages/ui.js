'use strict';

import CreateDialog from './ui/create_dialog';
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
    driver.click('#createBtn');
  }

  get createDialog() {
    return new CreateDialog('#createDocDialog');
  }

  static get() {
    driver.url('/ui');
    driver.waitForExist('nuxeo-app');
    return new UI();
  }

}
