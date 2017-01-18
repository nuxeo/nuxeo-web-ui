'use strict';

export default class NoteEditor {

  constructor(el) {
    this.el = el;
  }

  get alloy() {
    return this.el.element('#editor');
  }

  alloyHasContent(content) {
    let editor = this.alloy;
    driver.waitUntil(function() {
      return editor.getAttribute('innerHTML') === content;
    }.bind(this), 5000, 'The editor does not have such content');
    return true;
  }

  save() {
    let button = this.el.element('paper-button[name="editorSave"]');
    button.waitForVisible();
    button.click();
  }
}
