import BasePage from '../../base';
import DocumentMetadata from './document_metadata';
import DocumentView from './document_view';
import DocumentVersions from './document_versions';
import DocumentCommentThread from './document_comment_thread';

export default class DocumentPage extends BasePage {
  constructor(selector, docType) {
    super(selector);
    this.docType = docType;
  }

  get view() {
    return (async () => new DocumentView(`${this._selector} nuxeo-document-view div#container`, this.docType))();
  }

  get metadata() {
    return new DocumentMetadata('nuxeo-document-metadata', this.docType);
  }

  get versions() {
    return new DocumentVersions(`${this._selector} nuxeo-document-versions`);
  }

  get previewButton() {
    return this.el.element('nuxeo-preview-button');
  }

  get downloadButton() {
    return this.el.$('nuxeo-download-button');
  }

  get versionInfoBar() {
    this.el.waitForExist('#versionInfoBar');
    this.el.waitForVisible('#versionInfoBar');
    return this.el.element('#versionInfoBar');
  }

  get restoreVersionButton() {
    return (async () => {
      const versionInfoBar = await this.versionInfoBar;
      return versionInfoBar.element('nuxeo-restore-version-button');
    })();
  }

  get restoreVersionButtonConfirm() {
    return (async () => {
      const versionInfoBar = await this.versionInfoBar;
      return versionInfoBar.element('nuxeo-restore-version-button paper-button[dialog-confirm]');
    })();
  }

  get info() {
    return this.el.element('nuxeo-document-info');
  }

  get infoBar() {
    return this.el.element('nuxeo-document-info-bar');
  }

  get taskInfo() {
    return this.el.element('nuxeo-document-info-bar .task');
  }

  get processWorkflowButton() {
    return this.el.element('nuxeo-document-info-bar .task paper-button');
  }

  get abandonWorkflowButton() {
    return this.el.element('nuxeo-document-info-bar .workflow paper-button');
  }

  get comments() {
    return new DocumentCommentThread('nuxeo-document-comment-thread[name="comments"]');
  }

  get publicationsCount() {
    return (async () => {
      const info = await this.el.element('nuxeo-document-info');
      if (info) {
        const items = await this.el.elements('nuxeo-document-info .item');
        let pub;
        for (let i = 0; i < items.length; i++) {
          // eslint-disable-next-line no-await-in-loop
          const itemText = await items[i].getText();
          if (itemText === 'Publications') {
            pub = items[i];
          }
        }
        if (pub) {
          return parseInt(
            pub
              .$('div')
              .getText()
              .trim(),
            10,
          );
        }
      }
      return 0;
    })();
  }
}
