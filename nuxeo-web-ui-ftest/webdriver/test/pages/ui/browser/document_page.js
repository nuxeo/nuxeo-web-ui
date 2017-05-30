'use strict';

import BasePage from '../../base';
import DocumentEdit from './document_edit';
import DocumentMetadata from './document_metadata';
import DocumentView from './document_view';
import DocumentVersions from './document_versions';

export default class DocumentPage extends BasePage {

  constructor(selector, docType) {
    super(selector);
    this.docType = docType;
  }

  get view() {
    return new DocumentView(`nuxeo-document-view`, this.docType);
  }

  get edit() {
    return new DocumentEdit(`nuxeo-document-edit`, this.docType);
  }

  get metadata() {
    return new DocumentMetadata('nuxeo-document-metadata', this.docType);
  }

  get versions() {
    return new DocumentVersions('nuxeo-document-versions');
  }

  get editButton() {
    return this.el.element('#edit');
  }

  get saveButton() {
    return this.el.element('#save');
  }

  get previewButton() {
    return this.el.element('nuxeo-preview-button');
  }

  get versionInfoBar() {
    this.el.waitForExist('#versionInfoBar');
    this.el.waitForVisible('#versionInfoBar');
    return this.el.element('#versionInfoBar');
  }

  get restoreVersionButton() {
    return this.versionInfoBar.element('nuxeo-restore-version-button');
  }

  get restoreVersionButtonConfirm() {
    return this.versionInfoBar.element('nuxeo-restore-version-button paper-button[dialog-confirm]');
  }
}
