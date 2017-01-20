'use strict';

import Browser from './ui/browser';
import CreateDialog from './ui/create_dialog';
import Collections from './ui/collections';
import CollectionBrowser from './ui/collectionBrowser';
import Favorites from './ui/favorites';
import Drawer from './ui/drawer';
import Home from './ui/home';
import Vocabulary from './ui/admin/vocabulary';
import BasePage from './base'

export default class UI extends BasePage {

  goHome() {
    this.drawer.logo.click();
  }

  get vocabularyAdmin() {
    if (!browser.getUrl().endsWith('vocabulary-management')) {
      driver.url(process.env.NUXEO_URL ? '/#!/admin/vocabulary-management' : '/ui/#!/admin/vocabulary-management');
    }
    return new Vocabulary('nuxeo-vocabulary-management');
  }

  get createDialog() {
    return this._createDialog = this._createDialog ? this._createDialog : new CreateDialog('#createDocDialog');
  }

  get createButton() {
    return this.el.element('#createBtn');
  }

  get drawer() {
    return new Drawer('#drawer');
  }

  static get() {
    driver.url(process.env.NUXEO_URL ? '/' : '/ui');
    return new UI('nuxeo-app');
  }

  get home() {
    return new Home('nuxeo-home');
  }

  get browser() {
    return new Browser('nuxeo-browser');
  }

  get pages() {
    return this.el.element('#mainContainer iron-pages');
  }

  get search() {
    return this.pages.element('nuxeo-search-results');
  }

  get suggester() {
   return this.el.element('#mainContainer nuxeo-suggester'); 
  }

  get collectionBrowser() {
    return new CollectionBrowser('nuxeo-collection-results');
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
