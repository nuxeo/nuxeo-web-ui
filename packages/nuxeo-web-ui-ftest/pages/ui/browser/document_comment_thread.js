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
      const visibleItems = items.map(async (item) => {
        const isDisplayed = await item.isVisible();
        return isDisplayed;
      });
      const countVisibleItem = await Promise.all(visibleItems);
      const filterItem = countVisibleItem.filter((item) => item === true);
      return filterItem.length;
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
    const match = comments.map(async (item) => {
      const comment = new DocumentComment(item);
      const authorName = await comment.author;
      const authorText = await authorName.getText();
      const commentText = await comment.text;
      const textComment = await commentText.getText();
      return authorText === user && textComment === text;
    });

    const promiseValue = await Promise.all(match);
    const trueIndex = promiseValue.findIndex((item) => item === true);

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
