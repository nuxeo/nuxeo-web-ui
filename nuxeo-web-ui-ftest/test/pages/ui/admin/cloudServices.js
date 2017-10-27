'use strict';

import BasePage from '../../base';

export default class CloudServices extends BasePage {

  get nuxeoCloudTokens() {
    return this.el.element('nuxeo-cloud-tokens');
  }

  get nuxeoCloudProviders() {
    return this.el.element('nuxeo-cloud-providers');
  }

  addProvider(provider) {
    driver.waitForVisible(`#addEntry`);
    this.el.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`);
    this.fillProviderDetails(provider);
    this.clickElementName(`save`);
  }

  editProvider(currentName, newDetails) {
    driver.waitForVisible(`nuxeo-data-table nuxeo-data-table-row [name="serviceName"]`);
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row').value;
    const edited = rows.forEach((row) => {
      console.log(`row: ${JSON.stringify(row)}`);
      if (row.getText(`[name="serviceName"]`).trim() === currentName) {
        row.click(`[name="edit"]`);
        driver.waitForVisible(`#dialog`);
        this.fillProviderDetails(newDetails);
        this.el.click('#dialog paper-button[name="save"]');
        return row;
      }
    });
    if (!edited) {
      throw new Error(`now provider found with named "${currentName}"`);
    }
  }

  deleteProvider(serviceName) {
    driver.waitForVisible(`nuxeo-data-table nuxeo-data-table-row [name="serviceName"]`);
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row').value;
    const deleted = rows.some((row) => {
      if (row.getText(`[name="serviceName"]`).trim() === serviceName) {
        row.click(`[name="delete"]`);
        driver.alertAccept();
      }
    });
    if (!deleted) {
      throw new Error(`now provider found with named "${serviceName}"`);
    }
  }

  fillProviderDetails(provider) {
    provider.rows().forEach((row) => {
      this.el.element(`#dialog input[name="${row[0]}"`).setValue(row[1]);
    });
  }

  clickElementName(name) {
    const selector = `[name="${(name)}"]`;
    driver.waitForVisible(selector);
    this.el.element(selector).click();
  }

  waitForHasProvider(id, reverse) {
    const el = this.el;
    driver.waitUntil(() => {
      const providers = el.elements(`[name="serviceName"`).value;
      if (reverse) {
        return providers.every((provider) => provider.getText().trim() !== id);
      } else {
        return providers.some((provider) => provider.getText().trim() === id);
      }
    }, reverse ? `The cloud services does have such provider` : `The cloud services does not have such provider`);
    return true;
  }
}
