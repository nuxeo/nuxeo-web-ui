'use strict';
import DocumentAttachments from './document_attachments';
import NoteEditor from '../note_editor';

export default class DocumentView {
  constructor(el, docType) {
    this.el = el;
    this.docType = docType;
  }

  isVisible() {
    return this.el.isVisible();
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }

  get preview() {
    return this.el.element('nuxeo-document-preview');
  }

  get layout() {
    return this.el.element(`nuxeo-${this.docType.toLowerCase()}-view-layout`);
  }

  get attachments() {
    return new DocumentAttachments(this.el.element('nuxeo-document-attachments'), this.docType);
  }

  get noteEditor() {
    return new NoteEditor(this.el.element('nuxeo-note-editor'));
  }
}
