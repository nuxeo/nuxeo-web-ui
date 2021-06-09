import BasePage from '../base';

export default class NoteEditor extends BasePage {
  setContent(content) {
    this.el.element('#editor').waitForVisible();
    this.el.element('#editor').setValue(content);
  }

  get textarea() {
    return this.el.element('#textarea');
  }

  get editButton() {
    return this.el.element('#editNote');
  }

  hasContent(content) {
    const editor = this.el.element('#editor');
    editor.waitForVisible();
    driver.waitUntil(() => {
      try {
        return editor.getHTML(false) === content;
      } catch (e) {
        return false;
      }
    }, 'The editor does not have such content');
    return true;
  }

  edit() {
    this.editButton.waitForVisible();
    this.editButton.click();
  }

  save() {
    const button = this.el.element('paper-button[name="editorSave"]');
    button.waitForVisible();
    button.click();
  }
}
