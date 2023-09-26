import DocumentPage from './document_page';

export default class CollapsibleDocumentPage extends DocumentPage {
  constructor(selector, docType) {
    super(selector);
    this.docType = docType;
  }

  get detailsCard() {
    return this.el.element('#detailsCard');
  }

  get metadata() {
    this.expandDetailsCard();
    return super.metadata;
  }

  get versions() {
    this.expandDetailsCard();
    return super.versions;
  }

  async expandDetailsCard() {
    const detailcardEle = await this.detailsCard;
    await detailcardEle.waitForVisible();
    // XXX: getAttribute('opened') returns 'false' instead of null when the attribute is set to false, not sure why
    if (detailcardEle.getAttribute('opened') === 'false') {
      await detailcardEle.waitForVisible('h5.header');
      await detailcardEle.click('h5.header');
    }
  }

  collapseDetailsCard() {
    this.detailsCard.waitForVisible();
    // XXX: getAttribute('opened') returns 'false' instead of null when the attribute is set to false, not sure why
    if (this.detailsCard.getAttribute('opened') !== 'false') {
      this.detailsCard.waitForVisible('h5.header');
      this.detailsCard.click('h5.header');
    }
  }
}
