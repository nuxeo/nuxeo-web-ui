import BasePage from '../../base';
import DocumentComment from './document_comment'; /* eslint import/no-cycle: 0 */

export default class DocumentCommentThread extends BasePage {
  get loadMoreCommentsLink() {
    return this.el.element('.more-content');
  }

  get nbItems() {
    const items = this.el.elements('nuxeo-document-comment');
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  get writingArea() {
    return this.el.element('#inputContainer');
  }

  getComment(text, user) {
    // XXX - support the possessive form (ie John's) for compat
    if (user.endsWith("'s")) {
      user = user.substr(0, user.length - 2);
    }
    const comments = this.el.elements('nuxeo-document-comment');
    const match = comments.find((item) => {
      const comment = new DocumentComment(item);
      return comment.author.getText() === user && comment.text.getText() === text;
    });
    if (match) {
      return new DocumentComment(match);
    }
    throw new Error(`No comment authored by "${user}" with the following text: "${text}" found`);
  }

  writeComment(text) {
    this.writingArea.scrollIntoView();
    this.writingArea.click();
    fixtures.layouts.setValue(this.writingArea, text);
    this.el.element('.input-area iron-icon[name="submit"]').waitForVisible();
    this.el.element('.input-area iron-icon[name="submit"]').click();
  }
}
