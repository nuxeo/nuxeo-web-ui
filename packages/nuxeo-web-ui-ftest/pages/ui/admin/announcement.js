import BasePage from '../../base.js';

export default class Announcement extends BasePage {
  get enabledToggle() {
    return this.el.$('#enabled');
  }

  get messageInput() {
    return this.el.$('#message');
  }

  get linkUrlInput() {
    return this.el.$('#linkUrl');
  }

  get linkLabelInput() {
    return this.el.$('#linkLabel');
  }

  get saveButton() {
    return this.el.$('#save');
  }

  async setEnabled(enabled) {
    const toggle = await this.enabledToggle;
    await toggle.waitForVisible();
    const checked = await toggle.getProperty('checked');
    if (checked !== enabled) {
      await toggle.click();
    }
  }

  async fillMessage(message) {
    const field = await this.messageInput;
    await field.waitForVisible();
    const textarea = await field.$('paper-textarea');
    await textarea.setValue(message);
  }

  async fillLink(linkUrl, linkLabel) {
    if (linkUrl !== undefined) {
      const field = await this.linkUrlInput;
      await field.waitForVisible();
      await (await field.$('paper-input')).setValue(linkUrl);
    }
    if (linkLabel !== undefined) {
      const field = await this.linkLabelInput;
      await field.waitForVisible();
      await (await field.$('paper-input')).setValue(linkLabel);
    }
  }

  async save() {
    const button = await this.saveButton;
    await button.waitForVisible();
    await button.click();
  }
}
