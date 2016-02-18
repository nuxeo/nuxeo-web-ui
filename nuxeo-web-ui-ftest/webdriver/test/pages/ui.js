'use strict';

import Admin from './ui/admin';
import Browser from './ui/browser';
import Home from './ui/home';

export default class UI {

  constructor() {
    this.home = new Home("nuxeo-home");
    this.browser = new Browser("nuxeo-browser");
    this.admin = new Admin("nuxeo-admin");
  }

  goTo(tab) {
    driver.click(`paper-tab[name="${tab}"]`);
  }

  static get() {
    driver.url('/ui');
    driver.waitForExist("nuxeo-app");
    return new UI();
  }

}
