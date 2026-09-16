import BasePage from '../base.js';

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
      // Text, XML and Markdown notes expose #editNote; HTML notes expose #editHtmlNote.
      const editButton = await this.el.element('#editNote');
      if (await editButton.isExisting()) {
        return editButton;
      }
      return this.el.element('#editHtmlNote');
    })();
  }

  get htmlPreview() {
    return this.el.element('#htmlPreview');
  }

  async hasHtmlContent(content) {
    const frame = await this.htmlPreview;
    await frame.waitForVisible();
    await driver.waitUntil(
      async () => {
        try {
          const srcdoc = await frame.getAttribute('srcdoc');
          return srcdoc && srcdoc.includes(content);
        } catch (e) {
          return false;
        }
      },
      {
        timeoutMsg: 'The note preview does not have such content',
      },
    );
    return true;
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
