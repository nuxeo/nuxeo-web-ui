'use strict';

module.exports = function () {
  this.Then('I can see the "$name" collection', (name) => this.ui.drawer.collections.hasCollection(name).should.be.true);
};
