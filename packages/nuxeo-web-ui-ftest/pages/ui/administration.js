import BasePage from '../base.js';
import Vocabulary from './admin/vocabulary.js';
import CloudServices from './admin/cloudServices.js';
import Audit from './admin/audit.js';
import { url } from '../helpers.js';

export default class Administration extends BasePage {
  get analytics() {
    return this.el.element('nuxeo-analytics');
  }

  get nxqlSearch() {
    return this.el.element('nuxeo-search-page#nxql');
  }

  // the Search button of the NXQL page's results view, which runs the query the page no longer
  // executes on load
  get nxqlSearchButton() {
    return (async () => {
      const page = await this.nxqlSearch;
      return page.$('paper-button.search');
    })();
  }

  get userAndGroupManagement() {
    return this.el.element('nuxeo-user-group-management');
  }

  get userGroupCreateButton() {
    return (async () => {
      const createEle = await this.el.element('#createButton');
      return createEle;
    })();
  }

  get vocabularyManagement() {
    return (async () => {
      const browserUrl = await browser.getUrl();
      if (!browserUrl.endsWith('vocabulary-management')) {
        await url(process.env.NUXEO_URL ? '#!/admin/vocabulary-management' : 'ui/#!/admin/vocabulary-management');
      }
      return new Vocabulary('nuxeo-vocabulary-management');
    })();
  }

  async goToVocabularyManagement() {
    const browserUrl = await browser.getUrl();
    if (!browserUrl.endsWith('vocabulary-management')) {
      await url(process.env.NUXEO_URL ? '#!/admin/vocabulary-management' : 'ui/#!/admin/vocabulary-management');
    }
    return this.vocabularyManagement;
  }

  get audit() {
    return new Audit('nuxeo-audit');
  }

  get cloudServices() {
    return new CloudServices('nuxeo-cloud-services');
  }

  async goToCloudServices() {
    const browserUrl = await browser.getUrl();
    await driver.pause(1000);
    if (!browserUrl.endsWith('cloud-services')) {
      await url(process.env.NUXEO_URL ? '#!/admin/cloud-services' : 'ui/#!/admin/cloud-services');
    }
    return this.cloudServices;
  }
}
