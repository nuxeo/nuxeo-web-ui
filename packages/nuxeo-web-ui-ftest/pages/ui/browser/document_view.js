import BasePage from '../../base';
import NoteEditor from '../note_editor';

export default class DocumentView extends BasePage {
  constructor(selector, docType) {
    super(selector);
    this.docType = docType;
  }

  get preview() {
    return this.el.element('nuxeo-document-preview');
  }

  get layout() {
    return this.el.element(`nuxeo-${this.docType.toLowerCase()}-view-layout`);
  }

  get noteEditor() {
    return new NoteEditor('nuxeo-note-editor');
  }
}
