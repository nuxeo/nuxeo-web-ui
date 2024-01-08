/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

class AuthorizedApp {
  constructor(element) {
    this.el = element;
  }

  get name() {
    return this.el.elements('nuxeo-data-table-cell')[0].getText();
  }

  get authorizationDate() {
    return this.el.elements('nuxeo-data-table-cell')[1].getText();
  }

  async revokeButton() {
    return (async () => {
      const ele = await this.el.element('paper-icon-button[name="revoke"]');
      return ele;
    })();
  }
}

export default class UserAuthorizedApps extends BasePage {
  async getApps(appName) {
    const elEx = await this.el;
    await elEx.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    const apps = await this.el
      .$$('nuxeo-data-table nuxeo-data-table-row:not([header])')
      .map((el) => new AuthorizedApp(el));
    const filterApps = [];
    if (appName) {
      for (let i = 0; i < apps.length; i++) {
        const app = await apps[i];
        const appText = await app.el.$('nuxeo-data-table-cell').getText();
        if (appName === appText) {
          filterApps.push(app);
        }
      }
      return filterApps;
    }
    return apps;
  }
}
