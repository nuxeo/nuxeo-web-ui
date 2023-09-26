/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

class Token {
  constructor(element) {
    this.el = element;
  }

  get userId() {
    return this.el.elements('nuxeo-data-table-cell')[1].getText();
  }

  get providerId() {
    return this.el.elements('nuxeo-data-table-cell')[0].getText();
  }

  async deleteButton() {
    const deleteEle = await this.el.element('paper-icon-button[name="delete"]');
    return deleteEle;
  }
}

export default class UserCloudServices extends BasePage {
  async getTokens(user, provider) {
    await driver.pause(1000);
    const ele = await this.el;
    await ele.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    const rowElements = await ele.elements('nuxeo-data-table nuxeo-data-table-row');
    const spliceEle = rowElements.splice(1); // skip the header
    const mapsEle = spliceEle.map((el) => new Token(el));
    const tokenCells = await this.el
      .$$('nuxeo-data-table nuxeo-data-table-row:not([header])')
      .map((img) => img.$$('nuxeo-data-table-cell'));
    const cellProvider = [];
    const cellUser = [];
    for (let i = 0; i < tokenCells.length; i++) {
      cellProvider.push(await tokenCells[i][0].getText());
      cellUser.push(await tokenCells[i][1].getText());
    }
    const tokens = await mapsEle.filter(
      (token, index) =>
        (user ? cellUser[index] === user : true) && (provider ? cellProvider[index] === provider : true),
    );
    return tokens;
  }
}
