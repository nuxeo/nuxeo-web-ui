import BasePage from '../../base';
import DocumentComment from './document_comment'; /* eslint import/no-cycle: 0 */

export default class DocumentCommentThread extends BasePage {
  get loadMoreCommentsLink() {
    return this.el.element('.more-content');
  }

  get nbItems() {
    const items = this.el.elements('nuxeo-document-comment').value;
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  get writingArea() {
    return this.el.element('#replyContainer');
  }

  getComment(text, user) {
    const comments = this.el.elements('nuxeo-document-comment').value;
    const match = comments.find((item) => {
      const comment = new DocumentComment(item);
      return comment.author.getText() === user && comment.text.getText() === text;
    });
    if (match) {
      return new DocumentComment(match);
    } else {
      throw new Error(`Not found any comment authored by "${user}" with the following text: "${text}"`);
    }
  }

  writeComment(text) {
    this.writingArea.scrollIntoView();
    this.writingArea.click();
    fixtures.layouts.setValue(this.writingArea, text);
    this.el.element('.reply-area iron-icon[name="submit"]').waitForVisible();
    this.el.element('.reply-area iron-icon[name="submit"]').click();
  }
}
