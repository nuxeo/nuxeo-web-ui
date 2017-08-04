'use strict';

import Browser from './ui/browser';
import CreateDialog from './ui/create_dialog';
import CollectionBrowser from './ui/collectionBrowser';
import Drawer from './ui/drawer';
import Home from './ui/home';
import Administration from './ui/administration.js';
import BasePage from './base';
import ActivityFeed from './ui/activity_feed';
import HistoryTable from './ui/history_table';
import User from './ui/user';
import Group from './ui/group';
import Search from './ui/search';

export default class UI extends BasePage {

  goHome() {
    this.drawer.logo.click();
  }

  reload() {
    driver.refresh();
  }

  get activityFeed() {
    return new ActivityFeed('nuxeo-document-activity');
  }

  get historyTable() {
    return new HistoryTable('nuxeo-document-history');
  }

  get user() {
    return new User('nuxeo-user-group-management');
  }

  get group() {
    return new Group('nuxeo-user-group-management');
  }

  get searchForm() {
    return new Search('nuxeo-search-form[name="defaultSearch"]');
  }

  get quickSearch() {
    return new Search('#suggester #suggester');
  }

  get searchButton() {
    return this.el.element('#searchButton');
  }

  get results() {
    return new Search('#results');
  }

  get searchResults() {
    const displayMode = this.results.displayMode;
    return new Search(`nuxeo-data-${displayMode}.results`);
  }

  get createDialog() {
    this._createDialog = this._createDialog ? this._createDialog : new CreateDialog('#createDocDialog');
    return this._createDialog;
  }

  get createButton() {
    return this.el.element('#createBtn');
  }

  get adminButton() {
    return this.el.element('nuxeo-menu-icon[name="administration"]');
  }

  get drawer() {
    return new Drawer('#drawer');
  }

  static get() {
    driver.url(process.env.NUXEO_URL ? '' : 'ui');
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
    return new Administration('nuxeo-admin');
  }

  get tasks() {
    return this.pages.element('nuxeo-tasks');
  }

  get tasksDashboard() {
    return this.pages.element('#tasks-dashboard');
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
