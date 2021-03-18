import { Then } from '@cucumber/cucumber';

Then('I can see the document belongs to the favorites', function() {
  this.ui.drawer.favorites.hasDocument(this.doc).should.be.true;
});

Then('I can remove the document from the favorites', function() {
  this.ui.drawer.favorites.removeDocument(this.doc).should.be.true;
});
