'use strict';

module.exports = function () {
  this.Then('I can see the Create File dialog', () => this.ui.createFile.isVisible.should.be.true);
};
