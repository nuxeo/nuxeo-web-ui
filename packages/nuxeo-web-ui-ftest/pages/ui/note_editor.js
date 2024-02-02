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

  async hasContent(content) {
    const editor = await this.el.element('#editor');
    await editor.waitForVisible();
    await driver.waitUntil(
      async () => {
        try {
          const result = (await editor.getHTML(false)) === content;
          return result;
        } catch (e) {
          return false;
        }
      },
      {
        timeoutMsg: 'The editor does not have such content',
      },
    );
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
