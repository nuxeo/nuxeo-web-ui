/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class UserAuthorizedApps extends BasePage {
  async getApps(appName) {
    await driver.pause(2000);
    const elEx = await this.el;
    await elEx.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    const rows = await this.el.$$('nuxeo-data-table nuxeo-data-table-row:not([header])');
    const cells = await this.el.$$('nuxeo-data-table nuxeo-data-table-row:not([header]) nuxeo-data-table-cell');
    const cellsPerRow = cells.length / rows.length;
    const filterAppNames = [];
    const filterApps = [];
    for (let i = 0; i < rows.length; i++) {
      const appText = await cells[cellsPerRow * i].getText();
      if (appText.trim() !== '') {
        filterAppNames.push(rows[i]);
      }
      if (appName === appText) {
        filterApps.push(rows[i]);
      }
    }
    if (appName) {
      return filterApps;
    }
    return filterAppNames;
  }

  async revokeButton(app, appName) {
    return (async () => {
      const rows = await app.$$('nuxeo-data-table nuxeo-data-table-row:not([header])');
      const cells = await app.$$('nuxeo-data-table nuxeo-data-table-row:not([header]) nuxeo-data-table-cell');
      const cellsPerRow = cells.length / rows.length;
      const revokeButtons = await app.$$(
        'nuxeo-data-table nuxeo-data-table-row:not([header]) paper-icon-button[name="revoke"]',
      );
      for (let i = 0; i < rows.length; i++) {
        const appText = await cells[cellsPerRow * i].getText();
        if (appName === appText) {
          return revokeButtons[i];
        }
      }
    })();
  }
}
