import BasePage from '../../base';
import DocumentVersions from './document_versions';

export default class PublicationDialog extends BasePage {
  publish(target, rendition, version, override) {
    // set target
    this.waitForVisible('#target');
    // XXX some times #target gets stale somewhere in between fetching it and setting the value...
    driver.waitUntil(() => {
      try {
        const targetSelect = this.el.element('#target');
        fixtures.layouts.setValue(targetSelect, target);
        return true;
      } catch (e) {
        return false;
      }
    });
    // set rendition
    if (rendition) {
      const renditionSelect = this.el.element('#rendition');
      fixtures.layouts.setValue(renditionSelect, rendition);
    }
    // set version
    if (version) {
      const versionsList = new DocumentVersions(`${this._selector} #version`);
      versionsList.toggle.waitForVisible();
      versionsList.toggle.click();
      versionsList.list.waitForVisible();
      versionsList.selectVersion(version);
      // XXX we need to wait for the version to change, otherwise we could be sending the wrong version
      versionsList.waitForVisible('.toggle-text');
      driver.waitUntil(() => {
        try {
          return versionsList.el.element('.toggle-text').getText() === version;
        } catch (e) {
          return false;
        }
      });
    }
    if (override) {
      const overrideCheckbox = this.el.element('#override');
      fixtures.layouts.setValue(overrideCheckbox, true);
    }
    this.el.waitForEnabled('#publish');
    this.el.click('#publish');
    return driver.waitForVisible('iron-overlay-backdrop', driver.options.waitForTimeout, true);
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
