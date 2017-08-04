'use strict';

import BasePage from '../base';

export default class NoteEditor extends BasePage {

  setContent(content) {
    this.el.element('#editor').waitForVisible();
    this.el.element('#editor').setValue(content);
  }

  get textarea() {
    return this.el.element('#textarea');
  }

  hasContent(content) {
    const editor = this.el.element('#editor');
    editor.waitForVisible();
    driver.waitUntil(() => {
      try {
        return editor.getAttribute('innerHTML') === content;
      } catch (e) {
        return false;
      }
    }, 'The editor does not have such content');
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
