'use strict';

import Browser from './ui/browser';
import CreateDialog from './ui/create_dialog';
import Drawer from './ui/drawer';
import Home from './ui/home';

export default class UI {

  constructor(selector) {
    this.app = driver.element(selector);
    this.drawer = new Drawer('#drawer');
    this.pages = this.app.element('#mainContainer iron-pages');
    this.suggester = this.app.element('#mainContainer nuxeo-suggester');
    this.createButton = this.app.element('#createBtn');
  }

  goHome() {
    this.drawer.logo.click();
  }

  get createDialog() {
    return this._createDialog = this._createDialog ? this._createDialog : new CreateDialog('#createDocDialog');
  }

  static get() {
    driver.url('/ui');
    return new UI('nuxeo-app');
  }

  get home() {
    return new Home('nuxeo-home');
  }

  get browser() {
    return new Browser('nuxeo-browser');
  }

  get search() {
    return this.pages.element('nuxeo-search-results');
  }

  get collection() {
    return this.pages.element('nuxeo-collection-results');
  }

  get administration() {
    return this.pages.element('nuxeo-admin');
  }

  get tasks() {
    return this.pages.element('nuxeo-tasks');
  }

  get isConnectionActive() {
    return driver.execute(() => document.querySelector('nuxeo-connection').active).value;
  }

  waitRequests() {
    driver.waitUntil(() => !this.isConnectionActive, 5000, 'Waiting for inactive connection');
  }

  view(option) {
    const selection = option.toLowerCase();
    const dropdown = driver.element('paper-toolbar paper-dropdown-menu #menuButton');
    dropdown.click('#trigger');
    dropdown.waitForVisible('#dropdown');
    dropdown.click(`#dropdown #contentWrapper div paper-menu div paper-icon-item[name="${selection}"]`);
  }
}
