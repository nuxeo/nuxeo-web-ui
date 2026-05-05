import nuxeo, { BlobHelper } from './client.js';

class DocumentHelper {
  constructor() {
    this.liveDocuments = [];
  }

  _retry(fn, retries = 5, interval = 500) {
    return new Promise((resolve, reject) =>
      fn()
        .then(resolve)
        .catch((error) =>
          setTimeout(() => {
            if (retries === 0) {
              reject(error);
              return;
            }
            this._retry(fn, --retries, interval).then(resolve, reject);
          }, interval),
        ),
    );
  }

  reset() {
    return Promise.all(
      this.liveDocuments.map((docUid) =>
        this._retry(() =>
          nuxeo
            .repository()
            .delete(docUid)
            .catch((e) => {
              if (!e.response) throw e;
              const { status, statusText, url } = e.response;
              // 404 means the document was already deleted (e.g. parent cascade) — ignore it
              if (status === 404) {
                return;
              }
              console.error(`${status} ${statusText} ${url}`);
              // Retry on conflict or server errors
              if (status === 409 || status >= 500) {
                throw e;
              }
            }),
        ),
      ),
    )
      .then(() => {
        this.liveDocuments = [];
      })
      .catch((e) => {
        console.error(e);
        // Clear liveDocuments even on failure to prevent re-deleting in subsequent After hooks
        this.liveDocuments = [];
      });
  }

  init(type = 'File', title = 'my document') {
    const doc = {
      'entity-type': 'document',
      name: title.replace(/[^a-z0-9.]/gi, '_'),
      type: type.trim(),
      properties: {
        'dc:title': title,
      },
    };
    if (type === 'Note') {
      doc.properties['note:mime_type'] = 'text/html';
      doc.properties['note:note'] = '';
    }
    return doc;
  }

  create(parent, document) {
    return nuxeo
      .repository()
      .create(parent, document)
      .then((doc) => {
        this.liveDocuments.push(doc.uid);
        return doc;
      });
  }

  addTag(document, tag) {
    return nuxeo
      .operation('Services.TagDocument')
      .input(document)
      .params({
        tags: tag,
      })
      .execute()
      .catch((error) => {
        throw new Error(error);
      });
  }

  createVersion(document, versionType) {
    return nuxeo
      .operation('Document.CreateVersion')
      .input(document.uid)
      .params({
        increment: versionType,
        saveDocument: true,
      })
      .execute();
  }

  setPermissions(document, permission, username) {
    return nuxeo
      .operation('Document.AddPermission')
      .input(typeof document === 'string' ? document : document.uid)
      .params({
        permission,
        username,
      })
      .execute();
  }

  delete(document) {
    return nuxeo
      .repository()
      .delete(document.path)
      .then(() => {
        this.liveDocuments.splice(this.liveDocuments.indexOf(document.uid), 1);
      });
  }

  trash(document) {
    return nuxeo
      .operation('Document.Trash')
      .input(document.uid)
      .execute()
      .then((doc) => doc);
  }

  attach(document, blobPath, asAttachment = false) {
    const blob = BlobHelper.fromPath(blobPath);
    const uploader = nuxeo.batchUpload();
    return uploader.upload(blob).then((result) => {
      if (asAttachment) {
        const params = {
          useMainBlob: false,
          context: {
            currentDocument: document.path,
          },
        };
        return nuxeo
          .operation('BlobHolder.AttachOnCurrentDocument')
          .input(uploader)
          .context(params.context)
          .params(params)
          .execute();
      }
      document.properties['file:content'] = {
        'upload-batch': result.blob['upload-batch'],
        'upload-fileId': '0',
      };
      return nuxeo.repository().update(document);
    });
  }

  import(parent, blobPath) {
    const blob = BlobHelper.fromPath(blobPath);
    const params = {
      context: {
        currentDocument: parent.path,
      },
    };
    const uploader = nuxeo.batchUpload();
    return uploader.upload(blob).then(() =>
      nuxeo
        .operation('FileManager.Import')
        .input(uploader)
        .context(params.context)
        .params(params)
        .execute()
        .then((docs) => {
          const doc = docs.entries[0];
          this.liveDocuments.push(doc.uid);
          return doc;
        }),
    );
  }

  getDocument(ref) {
    return nuxeo.repository().fetch(ref);
  }
}

export default new DocumentHelper();
