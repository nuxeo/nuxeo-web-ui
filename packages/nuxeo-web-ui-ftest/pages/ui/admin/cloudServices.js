/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class CloudServices extends BasePage {
  get nuxeoCloudTokens() {
    return this.el.$('nuxeo-cloud-tokens');
  }

  get nuxeoCloudTokensAuthorizedApplications() {
    return this.el.$('nuxeo-oauth2-provided-tokens');
  }

  get nuxeoCloudTokensCloudAccount() {
    return this.el.$('nuxeo-oauth2-consumed-tokens');
  }

  get nuxeoCloudProviders() {
    return this.el.$('nuxeo-cloud-providers');
  }

  get nuxeoCloudConsumers() {
    return this.el.$('nuxeo-cloud-consumers');
  }

  async addProvider(provider) {
    await driver.waitForVisible('#addEntry');
    const elem = await this.el.$('#addEntry');
    await elem.click();
    await driver.waitForVisible('#dialog:not([aria-hidden])');
    await this.fillProviderDetails(provider);
    await this.clickElementName('save');
  }

  async editProvider(currentName, newDetails) {
    const rows = await this.el.$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
    const edited = await this.el
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell span[name="serviceName"]').getText());
    const index = edited.findIndex((currenTitle) => currenTitle === currentName);
    if (index !== -1) {
      const rowEle = await rows[index];
      const editButton = await rowEle.$('[name="edit"]');
      await editButton.click();
      await driver.waitForVisible('#dialog:not([aria-hidden])');
      await this.fillProviderDetails(newDetails);
      const saveButtonEle = await this.el.$('#dialog:not([aria-hidden]) paper-button[name="save"]');
      await saveButtonEle.click();
      return true;
    }
    return false;
  }

  async deleteProvider(serviceName) {
    const rows = await browser.$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
    const deleted = await browser
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell span[name="serviceName"]').getText());
    const index = deleted.findIndex((currenTitle) => currenTitle === serviceName);
    if (index !== -1) {
      const rowEle = await rows[index].$('[name="delete"]');
      await rowEle.click();
      await driver.alertAccept();
      return true;
    }
    return false;
  }

  async fillProviderDetails(provider) {
    const rows = provider.rows();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const abc = await this.el.$(`#dialog:not([aria-hidden]) input[name="${row[0]}"`);
      await abc.setValue(row[1]);
    }
  }

  async clickElementName(name) {
    const selector = `[name="${name}"]`;
    await driver.waitForExist(selector);
    await this.el.$(selector).click();
  }

  async waitForHasProvider(id, reverse) {
    const el = await this.el;
    await driver.waitUntil(
      async () => {
        const providers = await el.elements('[name="serviceName"]');
        if (reverse) {
          return providers.every(async (provider) => (await provider.getText()).trim() !== id);
        }
        return providers.some(async (provider) => (await provider.getText()).trim() === id);
      },
      reverse ? 'The cloud services does have such provider' : 'The cloud services does not have such provider',
      {
        timeoutMsg: 'waitForHasProvider timedout',
      },
    );
    return true;
  }

  async waitForHasClient(id, reverse) {
    const el = await this.el;
    await driver.waitUntil(
      async () => {
        const clients = await el.elements('[name="id"]');
        if (reverse) {
          return clients.every(async (client) => (await client.getText()).trim() !== id);
        }
        return clients.some(async (client) => (await client.getText()).trim() === id);
      },
      reverse ? 'The cloud services does have such client' : 'The cloud services does not have such client',
      {
        timeoutMsg: 'waitForHasClient timedout',
      },
    );
    return true;
  }

  async fillClientDetails(client) {
    const clientRows = client.rows();
    for (let i = 0; i < clientRows.length; i++) {
      const row = clientRows[i];
      const fillClientDetails = await this.el.$(`#dialog:not([aria-hidden]) input[name="${row[0]}"`);
      await fillClientDetails.setValue(row[1]);
    }
  }

  async clickOnSaveClientBtn() {
    const saveButton = await this.el.element('#dialog:not([aria-hidden]) paper-button[id="save"]');
    await saveButton.click();
  }

  async addClient(client) {
    await driver.waitForVisible('#addClient');
    const addClient = await this.el.element('#addClient');
    await addClient.click();
    await driver.waitForVisible('#dialog:not([aria-hidden])');
    await this.fillClientDetails(client);
    await this.clickOnSaveClientBtn();
  }

  async editClient(currentClientId, newDetails) {
    const rows = await this.el.$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
    const edited = await this.el
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell span[name="id"]').getText());
    const index = edited.findIndex((currenTitle) => currenTitle === currentClientId);
    if (index !== -1) {
      const rowEle = await rows[index].$('[name="edit"]');
      await rowEle.click();
      await driver.waitForVisible('#dialog:not([aria-hidden])');
      await this.fillClientDetails(newDetails);
      await this.clickOnSaveClientBtn();
      return true;
    }
    return false;
  }

  async deleteClient(clientId) {
    const dataTable = await driver.$('nuxeo-data-table nuxeo-data-table-row [name="id"]');
    await dataTable.waitForVisible();
    const rows = await browser.$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
    const deleted = await browser
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell span[name="id"]').getText());
    const index = deleted.findIndex((currenTitle) => currenTitle === clientId);
    if (index !== -1) {
      const rowEle = await rows[index].$('[name="delete"]');
      await rowEle.click();
      await driver.alertAccept();
      return true;
    }
    return false;
  }
}
