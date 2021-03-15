import { Given, When, Then } from 'cucumber';

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

Given("{word}'s comment {string} has the following replies:", (user, text, table) => {
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

When("I edit {word}('s) comment {string} with the following text: {string}", function(user, text, newText) {
  this.ui.browser
    .documentPage()
    .comments.getComment(text, user === 'my' ? this.username : user)
    .edit();
  this.ui.browser.documentPage().comments.writeComment(newText);
  this.ui.browser.documentPage().comments.waitForNotVisible('.input-area iron-icon[name="submit"]');
});

When("I expand the reply thread for {word}('s) comment {string}", function(user, text) {
  const link = this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user)
    .summaryLink;
  link.waitForVisible();
  link.scrollIntoView();
  link.click();
});

When('I load all comments', function() {
  const link = this.ui.browser.documentPage().comments.loadMoreCommentsLink;
  link.waitForVisible();
  link.scrollIntoView();
  link.click();
});

When("I load all replies for {word}('s) comment {string}", function(user, text) {
  const comment = this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  const link = comment.thread.loadMoreCommentsLink;
  link.waitForVisible();
  link.scrollIntoView();
  link.click();
});

When("I remove {word}('s) comment {string}", function(user, text) {
  return this.ui.browser
    .documentPage()
    .comments.getComment(text, user === 'my' ? this.username : user)
    .remove();
});

When("I reply to {word}('s) comment {string} with the following text: {string}", function(user, text, reply) {
  return this.ui.browser
    .documentPage()
    .comments.getComment(text, user === 'my' ? this.username : user)
    .reply(reply);
});

When('I write a comment with the following text: {string}', function(comment) {
  return this.ui.browser.documentPage().comments.writeComment(comment);
});

Then('I can see the comment thread has {int} visible item(s)', function(nb) {
  this.ui.browser.documentPage().comments.waitForVisible();
  driver.waitUntil(() => this.ui.browser.documentPage().comments.nbItems === nb);
});

Then('I can see the comment thread has a total of {int} item(s) to be loaded', function(total) {
  this.ui.browser.documentPage().comments.waitForVisible();
  const link = this.ui.browser.documentPage().comments.loadMoreCommentsLink;
  link.waitForVisible();
  link.getText().should.be.equals(`View all ${total} comments`);
});

Then("I can see document's comment thread", function() {
  this.ui.browser.documentPage().comments.waitForVisible().should.be.true;
});

Then("I can see the reply thread for {word}('s) comment {string} has a total of {int} items to be loaded", function(
  user,
  text,
  total,
) {
  const comment = this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  comment.thread.waitForVisible();
  const link = comment.thread.loadMoreCommentsLink;
  link.waitForVisible();
  link.getText().should.be.equals(`View all ${total} replies`);
});

Then('I can see {word} comment: {string}', function(user, text) {
  return this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
});

Then('I can see {word} comment {string} has {int} visible replies', function(user, text, nb) {
  const comment = this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  comment.thread.waitForVisible();
  comment.thread.nbItems.should.be.equals(nb);
});

Then('I can see {word} comment {string} has a reply thread with {int} replies', function(user, text, nb) {
  const comment = this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  comment.summaryLink.waitForVisible();
  comment.summaryLink.getText().should.be.equals(`${nb} Replies`);
});

Then('I {word} see the extended options available for {word} comment: {string}', function(option, user, text) {
  option.should.to.be.oneOf(['can', 'cannot'], 'An unknown option was passed as argument');
  const comment = this.ui.browser.documentPage().comments.getComment(text, user === 'my' ? this.username : user);
  if (option === 'can') {
    comment.options.isVisible().should.be.true;
  } else {
    comment.options.isVisible().should.be.false;
  }
});
