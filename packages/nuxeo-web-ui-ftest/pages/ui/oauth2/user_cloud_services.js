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

  deleteButton() {
    return this.el.element('paper-icon-button[name="delete"]');
  }
}

export default class UserCloudServices extends BasePage {
  getTokens(user, provider) {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    let tokens = this.el
      .elements('nuxeo-data-table nuxeo-data-table-row')
      .splice(1) // skip the header
      .map((el) => new Token(el)); // and map every element to a wrapper we can work with
    tokens = tokens.filter(
      (token) => (user ? token.userId === user : true) && (provider ? token.providerId === provider : true),
    );
    return tokens;
  }
}
