import { Then } from '@cucumber/cucumber';

Then('I can see the picture formats panel', function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  page.el.$('.additional').waitForVisible('nuxeo-picture-formats').should.be.true;
});
