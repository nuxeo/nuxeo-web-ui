'use strict';

module.exports = function () {
  this.Then('I can see my home', () => this.ui.home.isSelected.should.be.true);

  this.Then('I have a "$title" card', (title) => this.ui.home.hasCard(title).should.be.true);
};
