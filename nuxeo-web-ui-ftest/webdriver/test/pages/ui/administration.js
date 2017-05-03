'use strict';

import Vocabulary from './admin/vocabulary';

export default class Administration {

  constructor(selector) {
    this._selector = selector;
  }

  get page() {
    return driver.element(this._selector);
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }

  get analytics() {
    return this.page.element('nuxeo-analytics');
  }

  get userAndGroupManagement() {
    return this.page.element('nuxeo-user-group-management');
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

}
