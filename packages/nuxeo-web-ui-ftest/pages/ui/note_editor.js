import BasePage from '../base';

export default class NoteEditor extends BasePage {
  setContent(content) {
    this.el.element('#editor').waitForVisible();
    this.el.element('#editor').setValue(content);
  }

  get textarea() {
    return this.el.$('#textarea');
  }

  get editButton() {
    return (async () => {
      const editButton = await this.el.element('#editNote');
      return editButton;
    })();
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

  async edit() {
    const editButtonEle = await this.editButton;
    await editButtonEle.waitForVisible();
    await editButtonEle.click();
  }

  async save() {
    const button = await this.el.$('paper-button[name="editorSave"]');
    await button.waitForVisible();
    await button.click();
  }
}
