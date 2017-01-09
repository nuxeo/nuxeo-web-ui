'use strict';

module.exports = function() {

  this.Then(/^I can see a ([-\w]+) previewer$/, (viewerType) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.view.waitForVisible();
    const preview = page.view.preview;
    preview.waitForVisible();
    preview.element('//div[@id="preview"]/' + viewerType).waitForVisible();
  });
};
