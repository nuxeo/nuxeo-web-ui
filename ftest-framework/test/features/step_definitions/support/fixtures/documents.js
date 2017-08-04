import nuxeo, { BlobHelper } from '../services/client';
import path from 'path';

global.liveDocuments = [];

fixtures.documents = {
  init: (type = 'File', title = 'my document') => {
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
  },
  create: (parent, document) => nuxeo.repository().create(parent, document).then((doc) => {
    liveDocuments.push(doc.path);
    return doc;
  }),
  createWithAuthor: (parent, document, username) => nuxeo.repository()
      .create(parent, document)
      .then((doc) => {
        liveDocuments.push(doc.path);
        if (username) {
          return doc.set({
            'dc:creator': username,
          }).save();
        }
        return doc;
      }),
  addTag: (document, tag) => nuxeo.operation('Services.TagDocument')
      .input(document)
      .params({
        tags: tag,
      })
      .execute()
      .catch((error) => {
        throw new Error(error);
      }),
  createVersion: (document, versionType) => nuxeo.operation('Document.CreateVersion').input(document.uid).params({
    increment: versionType,
    saveDocument: true,
  }).execute(),
  setPermissions: (document, permission, username) => nuxeo.operation('Document.AddPermission')
    .input(document.uid).params({
      permission,
      username,
    }).execute(),
  delete: (docPath) => nuxeo.repository().delete(docPath).then(() => {
    liveDocuments.splice(liveDocuments.indexOf(docPath), 1);
  }),
  attach: (document, blobPath, asAttachment = false) => {
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
        return nuxeo.operation('BlobHolder.AttachOnCurrentDocument')
            .input(uploader)
            .context(params.context)
            .params(params)
            .execute({ headers: { nx_es_sync: 'true' } });
      } else {
        document.properties['file:content'] = {
          'upload-batch': result.blob['upload-batch'],
          'upload-fileId': '0',
        };
        return nuxeo.repository().update(document);
      }
    });
  },
  import: (parent, blobPath) => {
    const blob = BlobHelper.fromPath(blobPath);
    const params = {
      context: {
        currentDocument: parent.path,
      },
    };
    const uploader = nuxeo.batchUpload();
    return uploader.upload(blob).then(() =>
      nuxeo.operation('FileManager.Import')
          .input(uploader)
          .context(params.context)
          .params(params)
          .execute({ headers: { nx_es_sync: 'true' } })
          .then((docs) => {
            const doc = docs.entries[0];
            liveDocuments.push(doc.path);
            return doc;
          })
    );
  },
};

module.exports = function () {
  this.Before(() => nuxeo.repository().fetch('/default-domain').then((doc) => { this.doc = doc; }));

  this.After(() => Promise.all(liveDocuments
      .filter((doc) => path.dirname(doc) === '/default-domain')
      .map((doc) => nuxeo.repository().delete(doc)))
      .then(() => { liveDocuments = []; }));
};
