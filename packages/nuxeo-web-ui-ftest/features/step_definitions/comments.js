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

Given(/([^\s']+)(?:'s)? comment "(.*)" has the following replies:/, (user, text, table) => {
  /*
   * Since we faced some issues with timestamps created server side when fire requests, we decided to fire them
   * sequentially. After correcting bug reported by NXP-26202 this method should be changed to:
   *
   *   Promise.all(table.rows()
   *   .map((row => fixtures.comments.create(fixtures.comments.get(user, text).id, row[0], row[1]))));
   */
  const comments = table
    .rows()
    .map((row) => () => fixtures.comments.create(fixtures.comments.get(user, text).id, row[0], row[1]));
  return comments.reduce((current, next) => current.then(next), Promise.resolve([]));
});

When(/I edit ([^\s']+)(?:'s)? comment "(.*)" with the following text: "(.*)"/,async function(user, text, newText) {
  await this.ui.browser
    .documentPage()
    .comments.getComment(text, user === 'my' ? this.username : user)
    .edit();
  await this.ui.browser.documentPage().comments.writeComment(newText);
  await this.ui.browser.documentPage().comments.waitForNotVisible('.input-area iron-icon[name="submit"]');
});

When(/I expand the reply thread for ([^\s']+)(?:'s)? comment "(.*)"/,async function(user, text) {
  const link = await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user)
    .summaryLink;
  await link.waitForVisible();
  await link.scrollIntoView();
  link.click();
});

When('I load all comments',async function() {
  const link = await this.ui.browser.documentPage().comments.loadMoreCommentsLink;
  await link.waitForVisible();
  await link.scrollIntoView();
  link.click();
});

When(/I load all replies for ([^\s']+)(?:'s)? comment "(.*)"/, async function(user, text) {
  const comment = await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  const link = await comment.thread.loadMoreCommentsLink;
  await link.waitForVisible();
  await link.scrollIntoView();
  link.click();
});

When(/I remove ([^\s']+)(?:'s)? comment "(.*)"/,async function(user, text) {
   return await this.ui.browser
    .documentPage()
    .comments.getComment(text, user === 'my' ? this.username : user)
    .remove();
});

When(/I reply to ([^\s']+)(?:'s)? comment "(.*)" with the following text: "(.*)"/,async function(user, text, reply) {
  return await this.ui.browser
    .documentPage()
    .comments.getComment(text, user === 'my' ? this.username : user)
    .reply(reply);
});

When('I write a comment with the following text: {string}',async function(comment) {
  return await this.ui.browser.documentPage().comments.writeComment(comment);
});

Then('I can see the comment thread has {int} visible item(s)',async function(nb) {
  await this.ui.browser.documentPage().comments.waitForVisible();
  driver.waitUntil(() => this.ui.browser.documentPage().comments.nbItems === nb);
});

Then('I can see the comment thread has a total of {int} item(s) to be loaded',async function(total) {
  await this.ui.browser.documentPage().comments.waitForVisible();
  const link = await this.ui.browser.documentPage().comments.loadMoreCommentsLink;
  await link.waitForVisible();
  await link.getText().should.be.equals(`View all ${total} comments`);
});

Then("I can see document's comment thread",async function() {
  const isVisible = await this.ui.browser.documentPage().comments.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected document comment to be visible');
  }
});

Then(/I can see the reply thread for ([^\s']+)(?:'s)? comment "(.*)" has a total of (\d+) items to be loaded/,async function(
  user,
  text,
  total,
) {
  const comment = await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  await comment.thread.waitForVisible();
  const link = await comment.thread.loadMoreCommentsLink;
  await link.waitForVisible();
  link.getText().should.be.equals(`View all ${total} replies`);
});

Then(/I can see ([^\s']+)(?:'s)? comment: "(.*)"/,async function(user, text) {
  return await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
});

Then(/I can see ([^\s']+)(?:'s)? comment "(.*)" has (\d+) visible replies/, async function(user, text, nb) {
  const comment = await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  await comment.thread.waitForVisible();
  comment.thread.nbItems.should.be.equals(nb);
});

Then(/I can see ([^\s']+)(?:'s)? comment "(.*)" has a reply thread with (\d+) replies/,async function(user, text, nb) {
  const comment = await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  await comment.summaryLink.waitForVisible();
  comment.summaryLink.getText().should.be.equals(`${nb} Replies`);
});

Then(/I (can|cannot) see the extended options available for ([^\s']+)(?:'s)? comment: "(.*)"/,async function(
  option,
  user,
  text,
) {
  option.should.to.be.oneOf(['can', 'cannot'], 'An unknown option was passed as argument');
  const comment = await this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  if (option === 'can') {
    comment.options.isVisible().should.be.true;
  } else {
    comment.options.isExisting().should.be.false;
  }
});