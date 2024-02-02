import DocumentCommentThread from './document_comment_thread'; /* eslint import/no-cycle: 0 */

export default class DocumentComment {
  constructor(element) {
    this._el = element;
  }

  get author() {
    return (async () => {
      const author = await this._el.element('.author');
      return author;
    })();
  }

  get dialog() {
    return (async () => {
      const dialog = this._el.element('#dialog');
      return dialog;
    })();
  }

  get options() {
    return (async () => {
      const horizontalOption = await this._el.$('.horizontal #options');
      return horizontalOption;
    })();
  }

  get replyButton() {
    return (async () => {
      const replyButton = await this._el.element('.text iron-icon[name="reply"]');
      return replyButton;
    })();
  }

  get summaryLink() {
    return (async () => {
      const summaryLinkContent = await this._el.element('#summary .more-content');
      return summaryLinkContent;
    })();
  }

  get text() {
    return (async () => {
      const text = await this._el.element('.text span');
      return text;
    })();
  }

  get thread() {
    return (async () => {
      const docThread = await new DocumentCommentThread('#thread');
      return docThread;
    })();
  }

  async edit() {
    const options = await this.options;
    await options.scrollIntoView();
    await options.click();
    const editButton = await options.element('paper-icon-item[name="edit"]');
    await editButton.click();
  }

  async remove() {
    const options = await this.options;
    const dialog = await this.dialog;
    await options.scrollIntoView();
    await options.click();
    const deleteButton = await options.element('paper-icon-item[name="delete"]');
    await deleteButton.click();
    await dialog.waitForVisible();
    const confirmButton = await dialog.element('paper-button[name="confirm"]');
    await confirmButton.click();
  }

  async reply(text) {
    const replyButton = await this.replyButton;
    const thread = await this.thread;
    await replyButton.waitForVisible();
    await replyButton.scrollIntoView();
    await replyButton.click();
    await thread.waitForVisible();
    await thread.writeComment(text);
  }
}
