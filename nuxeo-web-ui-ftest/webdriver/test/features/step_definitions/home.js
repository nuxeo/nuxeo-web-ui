"use strict";

import UI from '../../pages/ui';

module.exports = function () {

  this.Then(/^I can see my home/, () => this.ui.home.isSelected.should.be.true);

  this.Then(/^I have a "([^"]*)" card$/, (title) => this.ui.home.hasCard(title).should.be.true);

};