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
  getApps(appName) {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    let apps = this.el
      .elements('nuxeo-data-table nuxeo-data-table-row')
      .splice(1) // skip the header
      .map((el) => new AuthorizedApp(el)) // and map every element to a wrapper we can work with
      .filter((app) => !!app.name.trim());
    // because clients are update after tokens, there might be empty rows that must be filtered
    if (appName) {
      apps = apps.filter((app) => app.name === appName);
    }
    return apps;
  }
}
