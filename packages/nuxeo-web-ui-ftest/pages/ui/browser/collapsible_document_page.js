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

  expandDetailsCard() {
    this.detailsCard.waitForVisible();
    if (this.detailsCard.getAttribute('opened') === null) {
      this.detailsCard.waitForVisible('h5.header');
      this.detailsCard.click('h5.header');
    }
  }

  collapseDetailsCard() {
    this.detailsCard.waitForVisible();
    if (this.detailsCard.getAttribute('opened') !== null) {
      this.detailsCard.waitForVisible('h5.header');
      this.detailsCard.click('h5.header');
    }
  }
}
