import BasePage from '../../base';

export default class CloudServices extends BasePage {
  get nuxeoCloudTokens() {
    return this.el.element('nuxeo-cloud-tokens');
  }

  get nuxeoCloudTokensAuthorizedApplications() {
    return this.el.element('nuxeo-oauth2-provided-tokens');
  }

  get nuxeoCloudTokensCloudAccount() {
    return this.el.element('nuxeo-oauth2-consumed-tokens');
  }

  get nuxeoCloudProviders() {
    return this.el.element('nuxeo-cloud-providers');
  }

  get nuxeoCloudConsumers() {
    return this.el.element('nuxeo-cloud-consumers');
  }

  addProvider(provider) {
    driver.waitForVisible('#addEntry');
    this.el.element('#addEntry').click();
    driver.waitForVisible('#dialog:not([aria-hidden])');
    this.fillProviderDetails(provider);
    this.clickElementName('save');
  }

  editProvider(currentName, newDetails) {
    driver.waitForVisible('nuxeo-data-table nuxeo-data-table-row [name="serviceName"]');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    const edited = rows.some((row) => {
      if (row.isVisible('[name="serviceName"]') && row.getText('[name="serviceName"]').trim() === currentName) {
        row.click('[name="edit"]');
        driver.waitForVisible('#dialog:not([aria-hidden])');
        this.fillProviderDetails(newDetails);
        this.el.click('#dialog:not([aria-hidden]) paper-button[name="save"]');
        return true;
      }
      return false;
    });
    if (!edited) {
      throw new Error(`now provider found with named "${currentName}"`);
    }
  }

  deleteProvider(serviceName) {
    driver.waitForVisible('nuxeo-data-table nuxeo-data-table-row [name="serviceName"]');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    const deleted = rows.some((row) => {
      if (row.isVisible('[name="serviceName"]') && row.getText('[name="serviceName"]').trim() === serviceName) {
        row.click('[name="delete"]');
        driver.alertAccept();
        return true;
      }
      return false;
    });
    if (!deleted) {
      throw new Error(`now provider found with named "${serviceName}"`);
    }
  }

  fillProviderDetails(provider) {
    provider.rows().forEach((row) => {
      this.el.element(`#dialog:not([aria-hidden]) input[name="${row[0]}"`).setValue(row[1]);
    });
  }

  clickElementName(name) {
    const selector = `[name="${name}"]`;
    driver.waitForVisible(selector);
    this.el.element(selector).click();
  }

  waitForHasProvider(id, reverse) {
    const { el } = this;
    driver.waitUntil(
      () => {
        const providers = el.elements('[name="serviceName"');
        if (reverse) {
          return providers.every((provider) => provider.getText().trim() !== id);
        }
        return providers.some((provider) => provider.getText().trim() === id);
      },
      reverse ? 'The cloud services does have such provider' : 'The cloud services does not have such provider',
    );
    return true;
  }

  waitForHasClient(id, reverse) {
    const { el } = this;
    driver.waitUntil(
      () => {
        const clients = el.elements('[name="id"');
        if (reverse) {
          return clients.every((client) => client.getText().trim() !== id);
        }
        return clients.some((client) => client.getText().trim() === id);
      },
      reverse ? 'The cloud services does have such client' : 'The cloud services does not have such client',
    );
    return true;
  }

  fillClientDetails(client) {
    client.rows().forEach((row) => {
      this.el.element(`#dialog:not([aria-hidden]) input[name="${row[0]}"`).setValue(row[1]);
    });
  }

  clickOnSaveClientBtn() {
    this.el.click('#dialog:not([aria-hidden]) paper-button[id="save"]');
  }

  addClient(client) {
    driver.waitForVisible('#addClient');
    this.el.element('#addClient').click();
    driver.waitForVisible('#dialog:not([aria-hidden])');
    this.fillClientDetails(client);
    this.clickOnSaveClientBtn();
  }

  editClient(currentClientId, newDetails) {
    driver.waitForVisible('nuxeo-data-table nuxeo-data-table-row [name="id"]');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    const edited = rows.some((row) => {
      if (row.isVisible('[name="id"]') && row.getText('[name="id"]').trim() === currentClientId) {
        row.click('[name="edit"]');
        driver.waitForVisible('#dialog:not([aria-hidden])');
        this.fillClientDetails(newDetails);
        this.clickOnSaveClientBtn();
        return true;
      }
      return false;
    });
    if (!edited) {
      throw new Error(`no client found with id "${currentClientId}"`);
    }
  }

  deleteClient(clientId) {
    driver.waitForVisible('nuxeo-data-table nuxeo-data-table-row [name="id"]');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    const deleted = rows.some((row) => {
      if (row.isVisible('[name="id"]') && row.getText('[name="id"]').trim() === clientId) {
        row.click('[name="delete"]');
        driver.alertAccept();
        return true;
      }
      return false;
    });
    if (!deleted) {
      throw new Error(`no client found with Id "${clientId}"`);
    }
  }
}
