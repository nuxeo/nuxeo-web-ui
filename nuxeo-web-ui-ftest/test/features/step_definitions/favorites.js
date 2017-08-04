'use strict';

module.exports = function () {
  this.Then('I can see the document belongs to the favorites', () =>
      this.ui.drawer.favorites.hasDocument(this.doc).should.be.true);
  this.Then('I can remove the document from the favorites', () =>
      this.ui.drawer.favorites.removeDocument(this.doc).should.be.true);
};
