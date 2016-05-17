'use strict';

module.exports = function () {

  this.Then(/^I can edit the (.*)$/, (docType) => {
    this.ui.edit_doc.isVisible.should.be.true;
    this.ui.edit_doc.editTitle(docType);
    this.ui.edit_doc.submit();
  });
};
