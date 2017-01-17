'use strict';

module.exports = function () {
  this.Then('I can see the "$name" collection', (name) => this.ui.drawer.collections.hasCollection(name).should.be.true);
  this.Then('I can click on the "$name" collection', (name) => this.ui.drawer.collections.select(name).should.be.true);
  this.Then('I can see that the document belongs to the collection', () => this.ui.collectionBrowser.hasDocument(this.doc).should.be.true);
  this.Then('I can click the document in the collection', () => this.ui.collectionBrowser.clickDocument(this.doc).should.be.true);
  this.Then('I can see the collection is in queue mode', () => this.ui.drawer.collections.isQueueMode.should.be.true);
  this.Then('I can see the collection queue has the document', () => this.ui.drawer.collections.hasDocument(this.doc).should.be.true);
  this.Then('I can remove the document from the collection queue', () => this.ui.drawer.collections.removeDocument(this.doc).should.be.true);
  this.Then('I can see the collection queue does not have the document', () => this.ui.drawer.collections.hasDocument(this.doc).should.be.false);
};
