import BasePage from '../../base';

export default class DocumentVersions extends BasePage {
  get createVersionButton() {
    return this.el.$('nuxeo-document-create-version');
  }

  get dialog() {
    return (async () => {
      if (await this.list.isVisible()) {
        return this.el.$('nuxeo-document-versions-list nuxeo-document-create-version #dialog:not([aria-hidden])');
      }
      return this.el.$('nuxeo-document-create-version #dialog:not([aria-hidden])');
    })();
  }

  get dialogMajorOption() {
    return (async () => {
      const dialog = await this.dialog;
      const element = await dialog.$('paper-radio-button[name="major"]');
      return element;
    })();
  }

  get dialogMinorOption() {
    return (async () => {
      const dialog = await this.dialog;
      const element = await dialog.$('paper-radio-button[name="minor"]');
      return element;
    })();
  }

  get dialogNextMajor() {
    return (async () => {
      const dialog = await this.dialog;
      return dialog.$('#nextMajor');
    })();
  }

  get dialogNextMinor() {
    return (async () => {
      const dialog = await this.dialog;
      return dialog.$('#nextMinor');
    })();
  }

  get dialogDismissButton() {
    return this.dialog.$('paper-button[dialog-dismiss]');
  }

  get dialogConfirmButton() {
    return (async () => {
      const dialog = await this.dialog;
      const element = await dialog.$('paper-button[dialog-confirm]');
      return element;
    })();
  }

  get toggle() {
    return (async () => {
      const ele = await this.el;
      const toggleElement = await ele.$('nuxeo-tag.toggle');
      return toggleElement;
    })();
  }

  get list() {
    return this.el.$('nuxeo-document-versions-list');
  }

  get listCreateVersionButton() {
    return this.list.$('nuxeo-document-create-version');
  }

  get listCount() {
    return this.list.$$('div[name="version-item"]').length;
  }

  get listItems() {
    return this.list.$('#list-items');
  }

  listItem(index) {
    return this.list.$(`#version-id-${index}`);
  }

  listItemTitle(index) {
    return this.list.$(`#version-id-${index}.title`);
  }

  async selectVersion(label) {
    const toggleElement = await this.toggle;
    const text = await toggleElement.getText();
    if ((await text.trim()) === label) {
      return true;
    }
    const listItems = await this.listItems;
    const versionItem = await listItems.$('div[name="version-item"] .title')
    await versionItem.waitForVisible();
    const listItems1 = await this.listItems.$$('div[name="version-item"]');
    const itemsTitle = await browser.$$('div[name="version-item"]').map((img) => img.$('.title').getText());
    const index = itemsTitle.findIndex((currenTitle) => currenTitle === label);
    if (index === -1) {
      throw new Error(`Could not find version ${label}`);
    }
    const version = await listItems1[index];
    await version.waitForVisible();
    await version.click();
  }
}
