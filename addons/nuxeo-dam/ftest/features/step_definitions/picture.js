import { Then } from 'cucumber';

Then('I can see the picture formats panel', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.el.element('div.additional').waitForVisible('nuxeo-picture-formats').should.be.true;
});
