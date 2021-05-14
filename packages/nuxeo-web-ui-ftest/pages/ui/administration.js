import BasePage from '../base';
import Vocabulary from './admin/vocabulary';
import CloudServices from './admin/cloudServices';
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
    return this.el.element('#createButton');
  }

  get vocabularyManagement() {
    if (!browser.getUrl().endsWith('vocabulary-management')) {
      url(process.env.NUXEO_URL ? '#!/admin/vocabulary-management' : 'ui/#!/admin/vocabulary-management');
    }
    return new Vocabulary('nuxeo-vocabulary-management');
  }

  goToVocabularyManagement() {
    if (!browser.getUrl().endsWith('vocabulary-management')) {
      url(process.env.NUXEO_URL ? '#!/admin/vocabulary-management' : 'ui/#!/admin/vocabulary-management');
    }
    return this.vocabularyManagement;
  }

  get audit() {
    return this.el.element('nuxeo-audit');
  }

  get cloudServices() {
    return new CloudServices('nuxeo-cloud-services');
  }

  goToCloudServices() {
    if (!browser.getUrl().endsWith('cloud-services')) {
      url(process.env.NUXEO_URL ? '#!/admin/cloud-services' : 'ui/#!/admin/cloud-services');
    }
    return this.cloudServices;
  }
}
