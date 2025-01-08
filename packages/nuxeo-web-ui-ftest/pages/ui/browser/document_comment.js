import DocumentCommentThread from './document_comment_thread'; /* eslint import/no-cycle: 0 */

export default class DocumentComment {
  constructor(element, index) {
    this._el = element;
    this._index = index;
  }

  get author() {
    return (async () => {
      const ele = await this._el.elements('.author');
      const author = await ele[this._index];
      return author;
    })();
  }

  get dialog() {
    return (async () => {
      const ele = this._el.elements('#dialog');
      const dialog = await ele[this._index];
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
      const ele = await this._el.elements('.text span');
      const text = await ele[this._index];
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
