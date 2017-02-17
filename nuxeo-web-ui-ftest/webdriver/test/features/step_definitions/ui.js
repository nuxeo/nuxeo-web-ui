'use strict';

module.exports = function () {
  this.When('I click the "$button" button', (button) => this.ui.drawer.open(button));
  this.When('I select "$option" from the View menu', (option) => this.ui.view(option));
};
