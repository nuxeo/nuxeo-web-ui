'use strict';

import UI from '../../pages/ui';

module.exports = function () {
  this.When('I go to the UI', () => {
    this.ui = UI.get();
  });

  this.When('I click the "$tab" tab', (tab) => this.ui.goTo(tab));
};
