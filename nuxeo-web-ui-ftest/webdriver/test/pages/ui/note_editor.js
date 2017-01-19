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
    let editor = this.alloy;
    driver.waitUntil(function() {
      return editor.getAttribute('innerHTML') === content;
    }.bind(this), 'The editor does not have such content');
    return true;
  }

  edit() {
    let button = this.el.element('#editNote');
    button.waitForVisible();
    button.click();
  }

  save() {
    let button = this.el.element('paper-button[name="editorSave"]');
    button.waitForVisible();
    button.click();
  }
}
