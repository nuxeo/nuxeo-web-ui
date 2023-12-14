import BasePage from '../../base';
import DocumentLayout from './document_layout';

export default class DocumentCreate extends BasePage {
  async getDoctypeButton(docType) {
    const typeSelec = await this.el.$(`div[name="typeSelection"] paper-button[name="${docType}"]`);
    return typeSelec;
  }

  layout(docType) {
    return new DocumentLayout(`nuxeo-${docType.toLowerCase()}-create-layout`);
  }
}
