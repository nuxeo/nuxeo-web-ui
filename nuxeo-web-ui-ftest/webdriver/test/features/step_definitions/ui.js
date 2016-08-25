'use strict';

module.exports = function () {
  this.When('I click the "$button" button', (button) => this.ui.drawer.select(button));
  this.When('I click the "$name" search button', (name) => this.ui.drawer.selectSearch(name));
  this.When('I select "$option" from the View menu', (option) => this.ui.view(option));
};
