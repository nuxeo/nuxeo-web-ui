'use strict';

module.exports = function () {
  this.Then('I can see the $tab tree', (tab) => this.ui.drawer._section(tab).waitForVisible().should.be.true);

  this.Then('I can see the "$title" $tab tree node', (title, tab) => {
    this.ui.drawer._section(tab).waitForVisible();
    this.ui.drawer._section(tab).elementByTextContent(`.content a`, title).waitForVisible();
  });

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    this.ui.drawer._section(tab).waitForVisible();
    const el = this.ui.drawer._section(tab).elementByTextContent(`.content a`, title);
    el.waitForVisible();
    el.click();
  });

  this.Then('I can see the "$title" document', (title) => {
    this.ui.browser.waitForVisible();
    this.ui.browser.hasTitle(title).should.be.true;
  });
};
