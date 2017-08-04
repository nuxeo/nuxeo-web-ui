'use strict';

import BasePage from '../../base';
import DocumentAttachments from './document_attachments';
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

  get attachments() {
    return new DocumentAttachments('nuxeo-document-attachments', this.docType);
  }

  get noteEditor() {
    return new NoteEditor('nuxeo-note-editor');
  }
}
