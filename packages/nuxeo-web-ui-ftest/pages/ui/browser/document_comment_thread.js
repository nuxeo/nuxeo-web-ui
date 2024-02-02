/* eslint-disable no-await-in-loop */
import BasePage from '../../base';
import DocumentComment from './document_comment'; /* eslint import/no-cycle: 0 */

export default class DocumentCommentThread extends BasePage {
  get loadMoreCommentsLink() {
    return (async () => {
      const moreContent = await this.el.element('.more-content');
      return moreContent;
    })();
  }

  get nbItems() {
    return (async () => {
      await driver.pause(3000);
      const items = await this.el.elements('nuxeo-document-comment');
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        const item = await items[i].isVisible();
        if (item) {
          count++;
        }
      }
      return count;
    })();
  }

  get writingArea() {
    return (async () => {
      const inputContainer = await this.el.element('#inputContainer');
      return inputContainer;
    })();
  }

  async getComment(text, user) {
    const comments = await this.el.elements('nuxeo-document-comment');
    let trueIndex;
    for (let i = 0; i < comments.length; i++) {
      const item = await comments[i];
      const comment = new DocumentComment(item);
      const authorName = await comment.author;
      const authorText = await authorName.getText();
      const commentText = await comment.text;
      const textComment = await commentText.getText();
      if (authorText === user && textComment === text) {
        trueIndex = i;
        break;
      }
    }
    if (trueIndex > -1) {
      return new DocumentComment(comments[trueIndex]);
    }
    throw new Error(`No comment authored by "${user}" with the text "${text}" was found`);
  }

  async writeComment(text) {
    const writingAreaContainer = await this.writingArea;
    await writingAreaContainer.scrollIntoView();
    await writingAreaContainer.click();
    await fixtures.layouts.setValue(writingAreaContainer, text);
    const inputArea = await this.el.element('.input-area iron-icon[name="submit"]');
    await inputArea.waitForVisible();
    await inputArea.click();
  }
}
