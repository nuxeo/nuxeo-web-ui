import BasePage from '../../base';

export default class DocumentVersions extends BasePage {
  get createVersionButton() {
    return this.el.element('nuxeo-document-create-version');
  }

  get dialog() {
    if (this.list.isVisible()) {
      return this.el.element('nuxeo-document-versions-list nuxeo-document-create-version #dialog:not([aria-hidden])');
    }
    return this.el.element('nuxeo-document-create-version #dialog:not([aria-hidden])');
  }

  get dialogMajorOption() {
    return this.dialog.element('paper-radio-button[name="major"]');
  }

  get dialogMinorOption() {
    return this.dialog.element('paper-radio-button[name="minor"]');
  }

  get dialogNextMajor() {
    return this.dialog.element('#nextMajor');
  }

  get dialogNextMinor() {
    return this.dialog.element('#nextMinor');
  }

  get dialogDismissButton() {
    return this.dialog.element('paper-button[dialog-dismiss]');
  }

  get dialogConfirmButton() {
    return this.dialog.element('paper-button[dialog-confirm]');
  }

  get toggle() {
    return this.el.element('nuxeo-tag.toggle');
  }

  get list() {
    return this.el.element('nuxeo-document-versions-list');
  }

  get listCreateVersionButton() {
    return this.list.element('nuxeo-document-create-version');
  }

  get listCount() {
    return this.list.elements('div[name="version-item"]').length;
  }

  get listItems() {
    return this.list.element('#list-items');
  }

  listItem(index) {
    return this.list.element(`#version-id-${index}`);
  }

  listItemTitle(index) {
    return this.list.element(`#version-id-${index}.title`);
  }

  selectVersion(label) {
    if (this.toggle.getText().trim() === label) {
      return true;
    }
    this.listItems.waitForVisible('div[name="version-item"] .title');
    const items = this.listItems.elements('div[name="version-item"]');
    const version = items.find((item) => {
      const foundLabel = item.getText('.title').trim();
      return foundLabel === label;
    });
    if (!version) {
      throw Error(`Could not find version ${label}`);
    }
    version.waitForVisible();
    version.click();
  }
}
