import DocumentCommentThread from './document_comment_thread'; /* eslint import/no-cycle: 0 */

export default class DocumentComment {
  constructor(element) {
    this._el = element;
  }

  get author() {
    return this._el.element('.author');
  }

  get dialog() {
    return this._el.element('#dialog');
  }

  get options() {
    return this._el.$('.horizontal #options');
  }

  get replyButton() {
    return this._el.element('.text iron-icon[name="reply"]');
  }

  get summaryLink() {
    return this._el.element('#summary .more-content');
  }

  get text() {
    return this._el.element('.text span');
  }

  get thread() {
    return new DocumentCommentThread('#thread');
  }

  edit() {
    this.options.scrollIntoView();
    this.options.click();
    this.options.element('paper-icon-item[name="edit"]').click();
  }

  remove() {
    this.options.scrollIntoView();
    this.options.click();
    this.options.element('paper-icon-item[name="delete"]').click();
    this.dialog.waitForVisible();
    this.dialog.element('paper-button[name="confirm"]').click();
  }

  reply(text) {
    this.replyButton.waitForVisible();
    this.replyButton.scrollIntoView();
    this.replyButton.click();
    this.thread.waitForVisible();
    this.thread.writeComment(text);
  }
}
