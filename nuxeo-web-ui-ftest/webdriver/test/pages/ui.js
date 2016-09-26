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
  }

  goTo(button) {
    driver.click(`paper-icon-button[name='${button}']`);
  }

  goToSearch(button) {
    driver.click(`nuxeo-menu-icon[name='${button}Search']`);
  }

  goHome() {
    driver.click('paper-icon-button.logo');
  }

  goToBrowser() {
    driver.click(`paper-icon-button[icon="icons:folder-open"]`);
  }

  static get() {
    driver.url('/ui');
    driver.waitForExist('nuxeo-app');
    return new UI();
  }

}
