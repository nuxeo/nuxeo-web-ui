'use strict';

export default class NoteEditor {

  constructor(el) {
    this.el = el;
  }

  get alloy() {
    return this.el.element('#editor');
  }

  get textarea() {
    return this.el.element('#textarea');
  }

  alloyHasContent(content) {
    const editor = this.alloy;
    driver.waitUntil(() => editor.getAttribute('innerHTML') === content, 'The editor does not have such content');
    return true;
  }

  edit() {
    const button = this.el.element('#editNote');
    button.waitForVisible();
    button.click();
  }

  save() {
    const button = this.el.element('paper-button[name="editorSave"]');
    button.waitForVisible();
    button.click();
  }
}
