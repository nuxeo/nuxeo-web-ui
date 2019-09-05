import nuxeo from '../services/client';

fixtures.collections = {
  addToNewCollection: (document, colName) =>
    nuxeo
      .operation('Collection.Create')
      .params({
        name: colName,
      })
      .execute()
      .then((col) =>
        nuxeo
          .operation('Document.AddToCollection')
          .input(document)
          .params({
            collection: col,
          })
          .execute(),
      ),
  addToCollection: (document, colName) =>
    nuxeo
      .repository()
      .fetch(`/default-domain/${colName}`)
      .then((collection) =>
        nuxeo
          .operation('Document.AddToCollection')
          .input(document)
          .params({
            collection,
          })
          .execute(),
      ),
};
