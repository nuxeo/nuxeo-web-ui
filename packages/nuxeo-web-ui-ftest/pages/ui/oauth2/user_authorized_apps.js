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

  revokeButton() {
    return this.el.element('paper-icon-button[name="revoke"]');
  }
}

export default class UserAuthorizedApps extends BasePage {
  async getApps(appName) {
    const elEx = await this.el;
    await elEx.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    const elExElements = await elEx.elements('nuxeo-data-table nuxeo-data-table-row');
    const appSplice = elExElements.splice(1); // skip the header
    const appMaps = appSplice.map((el) => new AuthorizedApp(el));
    const appNames = await this.el
      .$$('nuxeo-data-table nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell').getText());

    let apps = appMaps.filter((_, index) => !!appName[index].trim());

    if (appName) {
      apps = apps.filter((_, index) => appNames[index] === appName);
    }
    return apps;
  }
}
