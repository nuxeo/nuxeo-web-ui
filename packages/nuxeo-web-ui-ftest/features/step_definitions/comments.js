/* eslint-disable no-await-in-loop */
import { Given, When, Then } from '@cucumber/cucumber';

Given('I have the following comment thread:', function(table) {
  /*
   * Since we faced some issues with timestamps created server side when fire requests, we decided to fire them
   * sequentially. After correcting bug reported by NXP-26202 this method should be changed to:
   *
   *   Promise.all(table.rows().map((row => fixtures.comments.create(this.doc.uid, row[0], row[1]))));
   */
  const comments = table.rows().map((row) => () => fixtures.comments.create(this.doc.uid, row[0], row[1]));
  return comments.reduce((current, next) => current.then(next), Promise.resolve([]));
});

Given(/([^\s']+)(?:'s)? comment "(.*)" has the following replies:/, async (user, text, table) => {
  /*
   * Since we faced some issues with timestamps created server side when fire requests, we decided to fire them
   * sequentially. After correcting bug reported by NXP-26202 this method should be changed to:
   *
   *   Promise.all(table.rows()
   *   .map((row => fixtures.comments.create(fixtures.comments.get(user, text).id, row[0], row[1]))));
   */
  const rows = await table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const comment = await fixtures.comments.get(user, text);
    await fixtures.comments.create(comment.id, row[0], row[1]);
  }
});

When(/I edit ([^\s']+)(?:'s)? comment "(.*)" with the following text: "(.*)"/, async function(user, text, newText) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  await comment.edit();
  await currentComments.writeComment(newText);
  await currentComments.waitForNotVisible('.input-area iron-icon[name="submit"]');
});

When(/I expand the reply thread for ([^\s']+)(?:'s)? comment "(.*)"/, async function(user, text) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const summaryLink = await comment.summaryLink;
  await summaryLink.waitForVisible();
  await summaryLink.scrollIntoView();
  await summaryLink.click();
});

When('I load all comments', async function() {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const link = await currentComments.loadMoreCommentsLink;
  await link.waitForVisible();
  await link.scrollIntoView();
  await link.click();
});

When(/I load all replies for ([^\s']+)(?:'s)? comment "(.*)"/, async function(user, text) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const thread = await comment.thread;
  await thread.waitForVisible();
  const link = await thread.loadMoreCommentsLink;
  await link.waitForVisible();
  await link.scrollIntoView();
  await link.click();
});

When(/I remove ([^\s']+)(?:'s)? comment "(.*)"/, async function(user, text) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const remove = await comment.remove();
  return remove;
});

When(/I reply to ([^\s']+)(?:'s)? comment "(.*)" with the following text: "(.*)"/, async function(user, text, reply) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const replyComment = await comment.reply(reply);
  return replyComment;
});

When('I write a comment with the following text: {string}', async function(comment) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  return currentComments.writeComment(comment);
});

Then('I can see the comment thread has {int} visible item(s)', async function(nb) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const nbItemLength = await currentComments.nbItems;
  nbItemLength.should.be.equals(nb);
});

Then('I can see the comment thread has a total of {int} item(s) to be loaded', async function(total) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const link = await currentComments.loadMoreCommentsLink;
  await link.waitForVisible();
  const linkText = await link.getText();
  linkText.should.be.equals(`View all ${total} comments`);
});

Then("I can see document's comment thread", async function() {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  const commentVisible = await currentComments.waitForVisible();
  commentVisible.should.be.true;
});

Then(
  /I can see the reply thread for ([^\s']+)(?:'s)? comment "(.*)" has a total of (\d+) items to be loaded/,
  async function(user, text, total) {
    const browser = await this.ui.browser;
    const docPage = await browser.documentPage();
    const currentComments = await docPage.comments;
    await currentComments.waitForVisible();

    const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
    const thread = await comment.thread;
    await thread.waitForVisible();
    const link = await thread.loadMoreCommentsLink;
    await link.waitForVisible();
    const linkText = await link.getText();
    linkText.should.be.equals(`View all ${total} replies`);
  },
);

Then(/I can see ([^\s']+)(?:'s)? comment: "(.*)"/, async function(user, text) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  return comment;
});

Then(/I can see ([^\s']+)(?:'s)? comment "(.*)" has (\d+) visible replies/, async function(user, text, nb) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const thread = await comment.thread;
  await thread.waitForVisible();
  const nbItemLength = await thread.nbItems;
  nbItemLength.should.be.equals(nb);
});

Then(/I can see ([^\s']+)(?:'s)? comment "(.*)" has a reply thread with (\d+) replies/, async function(user, text, nb) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const summaryLink = await comment.summaryLink;
  await summaryLink.waitForVisible();
  const summaryText = await summaryLink.getText();
  summaryText.should.be.equals(`${nb} Replies`);
});

Then(/I (can|cannot) see the extended options available for ([^\s']+)(?:'s)? comment: "(.*)"/, async function(
  option,
  user,
  text,
) {
  option.should.to.be.oneOf(['can', 'cannot'], 'An unknown option was passed as argument');
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage();
  const currentComments = await docPage.comments;
  await currentComments.waitForVisible();
  const comment = await currentComments.getComment(text, user === 'my' ? this.username : user);
  const commentOptions = await comment.options;
  if (option === 'can') {
    const commentOptionsVisible = await commentOptions.isVisible();
    commentOptionsVisible.should.be.true;
  } else {
    const commentOptionsExist = await commentOptions.isExisting();
    commentOptionsExist.should.be.false;
  }
});
