/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

class AuthorizedApp {
  constructor(element) {
    this.el = element;
  }

  get name() {
    return (async () => {
      const eles = await this.el.elements('nuxeo-data-table-cell');
      const ele = await eles[0];
      const eleText = await ele.getText();
      return eleText;
    })();
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
    const appsNew = await this.el
      .$$('nuxeo-data-table nuxeo-data-table-row:not([header])')
      .map((el) => new AuthorizedApp(el));
    const apps = await appsNew.filter(async (app) => !!(await app.name).trim());
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
