import Browser from './ui/browser';
import CreateDialog from './ui/create_dialog';
import Drawer from './ui/drawer';
import Home from './ui/home';
import Administration from './ui/administration';
import BasePage from './base';
import ActivityFeed from './ui/activity_feed';
import HistoryTable from './ui/history_table';
import User from './ui/user';
import Group from './ui/group';
import Search from './ui/search';
import BulkEdit from './ui/bulk_edit';
import UserAuthorizedApps from './ui/oauth2/user_authorized_apps';
import UserCloudServices from './ui/oauth2/user_cloud_services';
import { refresh, url } from './helpers';

export default class UI extends BasePage {
  goHome() {
    this.drawer.logo.click();
  }

  reload() {
    refresh();
  }

  get activityFeed() {
    $('nuxeo-document-page nuxeo-page-item[name="activity"]').waitForVisible();
    browser.click('nuxeo-document-page nuxeo-page-item[name="activity"]');
    $('nuxeo-document-activity').waitForVisible();
    return new ActivityFeed('nuxeo-document-activity');
  }

  get historyTable() {
    return new HistoryTable('nuxeo-audit-search');
  }

  get user() {
    return new User('nuxeo-user-group-management');
  }

  get group() {
    return new Group('nuxeo-user-group-management');
  }

  searchForm(name = 'defaultSearch') {
    return new Search(`nuxeo-search-form[name="${name}"]`);
  }

  get quickSearch() {
    return new Search('#suggester #suggester');
  }

  get trashSearchForm() {
    return new Search('nuxeo-search-form[name="trash"]');
  }

  get searchButton() {
    return this.el.$('#searchButton');
  }

  get results() {
    driver.waitUntil(async () => {
      if (await this.el.$('nuxeo-browser').isVisible()) {
        return this.browser.results;
      }
    });
    return new Search('nuxeo-search-results-layout[id="results"]');
  }

  get searchResults() {
    const { displayMode } = this.results;
    return new Search(`nuxeo-data-${displayMode}`);
  }

  get createDialog() {
    this._createDialog = this._createDialog ? this._createDialog : new CreateDialog('#createDocDialog');
    return this._createDialog;
  }

  get createButton() {
    return this.el.element('#createBtn');
  }

  get adminButton() {
    return this.el.$('nuxeo-menu-icon[name="administration"]');
  }

  get drawer() {
    return new Drawer('div[slot="drawer"]');
  }

  static get() {
    url(process.env.NUXEO_URL ? '' : 'ui');
    if (!global.locale) {
      $('nuxeo-app:not([unresolved])').waitForVisible();
      /* global window */
      (async () => {
        const locale = await browser.execute(() => window.nuxeo.I18n.language || 'en');
        if (locale) {
          global.locale = locale;
          moment.locale(global.locale);
        }
        return new UI('nuxeo-app');
      })();
    }
    return new UI('nuxeo-app');
  }

  get home() {
    return new Home('nuxeo-home');
  }

  get browser() {
    return new Browser('nuxeo-browser');
  }

  get pages() {
    return this.el.$('#pages');
  }

  get search() {
    return this.pages.$('nuxeo-search-results');
  }

  get suggester() {
    return this.el.$('#mainContainer nuxeo-suggester');
  }

  get administration() {
    return new Administration('nuxeo-admin');
  }

  get userCloudServices() {
    return new UserCloudServices('nuxeo-user-cloud-services');
  }

  goToUserCloudServices() {
    if (!browser.getUrl().endsWith('user-cloud-services')) {
      url(process.env.NUXEO_URL ? '#!/user-cloud-services' : 'ui/#!/user-cloud-services');
    }
    return this.userCloudServices;
  }

  get userAuthorizedApps() {
    return new UserAuthorizedApps('nuxeo-user-authorized-apps');
  }

  goToUserAuthorizedApps() {
    if (!browser.getUrl().endsWith('user-authorized-apps')) {
      url(process.env.NUXEO_URL ? '#!/user-authorized-apps' : 'ui/#!/user-authorized-apps');
    }
    return this.userAuthorizedApps;
  }

  get tasks() {
    return this.pages.$('nuxeo-tasks');
  }

  get emptyAuthorizedApps() {
    return this.el.$('nuxeo-data-table .emptyResult');
  }

  get isConnectionActive() {
    /* global document */
    return driver.execute(() => document.querySelector('nuxeo-connection').active);
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

  async waitForToastNotVisible() {
    driver.waitUntil(async () => {
      const mwcsnackbar = await driver.elements('mwc-snackbar');
      return mwcsnackbar.every((toast) => !toast.getAttribute('open'));
    });
  }

  async getToastDismissButton() {
    const snackbar = await this.el.element('#snackbarPanel mwc-snackbar[open] #dismiss');
    return snackbar;
  }

  async getToastMessage(message) {
    let snackBar;
    await driver.waitUntil(async () => {
      snackBar = await this.el.element('#snackbarPanel mwc-snackbar[open] .mdc-snackbar__label');
      const trimmedMessage = message.trim().replace(/"/g, '');
      const snackBarText = await snackBar.getText();
      return snackBarText === trimmedMessage;
    });
    const snackBarText = await snackBar.getText();
    return snackBarText;
  }

  bulkEdit(selector) {
    return new BulkEdit(selector);
  }

  get filterView() {
    return this.el.element('paper-icon-button[id="toogleFilter"]');
  }
}
