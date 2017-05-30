'use strict';

import BasePage from '../base';
import Vocabulary from './admin/vocabulary';
import CloudServices from './admin/cloudServices';

export default class Administration extends BasePage {

  get analytics() {
    return this.el.element('nuxeo-analytics');
  }

  get userAndGroupManagement() {
    return this.el.element('nuxeo-user-group-management');
  }

  get userGroupCreateButton() {
    return this.el.element('#createButton.nuxeo-user-group-management');
  }

  get vocabularyManagement() {
    if (!browser.getUrl().endsWith('vocabulary-management')) {
      driver.url(process.env.NUXEO_URL ? '#!/admin/vocabulary-management' : 'ui/#!/admin/vocabulary-management');
    }
    return new Vocabulary('nuxeo-vocabulary-management');
  }

  goToVocabularyManagement() {
    if (!browser.getUrl().endsWith('vocabulary-management')) {
      driver.url(process.env.NUXEO_URL ? '#!/admin/vocabulary-management' : 'ui/#!/admin/vocabulary-management');
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
      driver.url(process.env.NUXEO_URL ? '#!/admin/cloud-services' : 'ui/#!/admin/cloud-services');
    }
    return this.cloudServices;
  }

}
