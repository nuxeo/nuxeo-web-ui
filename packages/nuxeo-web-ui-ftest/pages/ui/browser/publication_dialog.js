import BasePage from '../../base';
import DocumentVersions from './document_versions';

export default class PublicationDialog extends BasePage {
  async publish(target, rendition, version, override) {
    // set target
    const targetSelect = await this.el.$('#target');
    await targetSelect.waitForVisible();
    await fixtures.layouts.setValue(targetSelect, target);
    // set rendition
    if (rendition) {
      const renditionSelect = await this.el.$('#rendition');
      await fixtures.layouts.setValue(renditionSelect, rendition);
    }
    // set version
    if (version) {
      const versionsList = new DocumentVersions(`${this._selector} #version`);
      const versionListToggle = await versionsList.toggle;
      await versionListToggle.waitForVisible();
      await versionListToggle.click();
      const list = await versionsList.list;
      await list.waitForVisible();
      await versionsList.selectVersion(version);
      // XXX we need to wait for the version to change, otherwise we could be sending the wrong version
      const ele = await versionsList.el.$('.toggle-text');
      await driver.pause(1000);
      await ele.waitForVisible();
      const outputText = await ele.getText();
      if (outputText !== version) {
        throw new Error(`Could not find version ${version}`);
      }
    }
    if (override) {
      const overrideCheckbox = await this.el.$('#override');
      await fixtures.layouts.setValue(overrideCheckbox, true);
    }
    await this.el.waitForEnabled('#publish');
    const ele = await this.el.$('#publish');
    await ele.click();
    const result = await driver.waitForVisible('iron-overlay-backdrop', 30000, true);
    return result;
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
