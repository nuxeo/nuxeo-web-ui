import BasePage from '../base';
import Vocabulary from './admin/vocabulary';
import CloudServices from './admin/cloudServices';
import Audit from './admin/audit';
import { url } from '../helpers';

export default class Administration extends BasePage {
  get analytics() {
    return this.el.element('nuxeo-analytics');
  }

  get nxqlSearch() {
    return this.el.element('nuxeo-search-page#nxql');
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
