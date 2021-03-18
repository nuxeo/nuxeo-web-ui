import { Then } from '@cucumber/cucumber';

Then('I can see the {string} collection', function(name) {
  this.ui.drawer.collections.waitForHasCollection(name).should.be.true;
});
Then('I can click on the {string} collection', function(name) {
  this.ui.drawer.collections.select(name).should.be.true;
});
Then('I can see that the document belongs to the collection', function() {
  this.ui.browser.waitForHasChild(this.doc).should.be.true;
});
Then('I can click the document in the collection', function() {
  this.ui.browser.clickChild(this.doc.title).should.be.true;
});
Then('I can see the collection is in queue mode', function() {
  this.ui.drawer.collections.isQueueMode.should.be.true;
});
Then('I can see the collection queue has the document', function() {
  this.ui.drawer.collections.waitForHasMember(this.doc).should.be.true;
});
Then('I can remove the document from the collection queue', function() {
  this.ui.drawer.collections.removeMember(this.doc).should.be.true;
});
Then('I can see the collection queue does not have the document', function() {
  this.ui.drawer.collections.waitForHasMember(this.doc, true).should.be.true;
});
