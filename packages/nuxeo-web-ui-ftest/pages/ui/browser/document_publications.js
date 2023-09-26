/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class DocumentPublications extends BasePage {
  get count() {
    return (async () => {
      await driver.pause(2000);
      let elementCount = 0;
      const elementsHidden = await browser
        .$$('nuxeo-data-table#table nuxeo-data-table-row:not([header])')
        .map((img) => img.getAttribute('hidden'));
      for (let i = 0; i < elementsHidden.length; i++) {
        const row = elementsHidden[i];
        if (row === null) {
          elementCount++;
        }
      }
      return elementCount;
    })();
  }

  async hasPublication(path, rendition, version) {
    const pubicationRow = await !!this.getPublicationRow(path, rendition, version);
    return pubicationRow;
  }

  async getPublicationRow(path, rendition, version) {
    const ele = await this.el.$('nuxeo-data-table#table nuxeo-data-table-row:not([header])');
    await ele.waitForVisible();
    const rows = await this.el.$$('nuxeo-data-table#table nuxeo-data-table-row:not([header])');
    let index;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.isVisible('nuxeo-data-table-cell a.path')) {
        const foundPath = await row.$('nuxeo-data-table-cell a.path').getText();
        const foundPathLowerCase = await foundPath.toLowerCase();
        if (foundPathLowerCase.indexOf(path.trim().toLowerCase()) !== 0) {
          index = -1;
        }
        const foundRendition = await row.$('nuxeo-data-table-cell .rendition').getText();
        const foundRenditionLowerCase = foundRendition.trim().toLowerCase();
        if (foundRenditionLowerCase !== rendition.toLowerCase()) {
          index = -1;
        }
        const foundVersion = await row.$('nuxeo-data-table-cell .version').getText();
        const foundVersionLowerCase = foundVersion.trim().toLowerCase();
        if (foundVersionLowerCase && version != null && foundVersion !== version.toLowerCase()) {
          index = -1;
        }
        index = i;
      }
    }
    if (index !== -1) {
      return rows[index];
    }
    return false;
  }

  async republish(path, rendition, version) {
    const pubRow = await this.getPublicationRow(path, rendition, version);
    if (pubRow) {
      await pubRow.waitForVisible('paper-button.republish');
      const xyz = await pubRow.element('paper-button.republish');
      await xyz.click();
      await driver.alertAccept();
    } else {
      throw new Error(`Could not find publication ${path} ${rendition} ${version}`);
    }
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
