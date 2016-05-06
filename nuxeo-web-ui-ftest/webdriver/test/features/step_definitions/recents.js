'use strict';

module.exports = function () {
  this.Then('I can see the list of recently viewed documents', () => this.ui.recents.isSelected.should.be.true);
};
