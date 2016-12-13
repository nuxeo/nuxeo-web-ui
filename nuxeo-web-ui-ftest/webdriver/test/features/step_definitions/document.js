'use strict';

var teardownCbs = [];
var doc = {
  'entity-type': 'document',
  name: 'doc',
  properties: {
    'dc:title': 'my document',
  }
};

module.exports = function() {

  this.Given(/^I have a(?: (.*))document$/, (docType = 'File') => {
    doc.type = docType.trim();
    // create the document
    return this.client.repository().create('/default-domain/', doc).then((doc) => {
      // add a callback to teardown the document
      teardownCbs.push(((path) => {
        return () => this.client.repository().delete(path);
      })(doc.path));
    })
  });

  this.When('I browse to the document', () => {
    driver.url('/#!/browse/default-domain/' + doc.name);
    driver.waitForExist('p.title', 5000);
  });

  this.Then(/^I can edit the (.*) metadata$/, (docType) => {
    const page = this.ui.browser.documentPage(docType);
    page.metadata.element('///section[@mode="view"]').isVisible().should.be.true;
    page.metadata.click('#edit');

    page.edit.isVisible().should.be.true;
    page.edit.title = docType;
    page.edit.submit();
  });

  this.After(function(scenario) {
    return Promise.all(teardownCbs.map((cb) => cb()));
  });
};
