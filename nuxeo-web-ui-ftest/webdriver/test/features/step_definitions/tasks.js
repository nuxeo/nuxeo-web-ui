'use strict';

module.exports = function () {
  this.Then('I can see the list of tasks', () => this.ui.tasks.isSelected.should.be.true);
};
