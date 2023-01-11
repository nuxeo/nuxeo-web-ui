import BasePage from '../base';

export default class NoteEditor extends BasePage {
  setContent(content) {
    this.el.$('#editor').waitForVisible();
    this.el.$('#editor').setValue(content);
  }

  get textarea() {
    return this.el.$('#textarea');
  }

  get editButton() {
    return this.el.$('#editNote');
  }

  hasContent(content) {
    const editor = this.el.$('#editor');
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
    const button = this.el.$('paper-button[name="editorSave"]');
    button.waitForVisible();
    button.click();
  }
}
