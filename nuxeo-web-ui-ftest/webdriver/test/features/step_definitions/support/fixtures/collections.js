import nuxeo from '../services/client';

global.liveCollections = [];

fixtures.collections = {
  addToNewCollection: (document, colName) =>
    nuxeo.operation('Collection.Create').params({
      name: colName,
    }).execute().then((col) => {
      liveCollections.push(colName);
      return nuxeo.operation('Document.AddToCollection').input(document).params({
        collection: col,
      }).execute();
    }),
  addToCollection: (document, colName) => nuxeo.repository()
      .fetch(`/default-domain/${colName}`)
      .then((collection) => nuxeo.operation('Document.AddToCollection')
          .input(document)
          .params({
            collection,
          })
          .execute()
        ),
};

module.exports = function () {
  this.After(() => Promise.all(liveCollections
      .map((col) => nuxeo.repository().delete(`/default-domain/UserWorkspaces/${this.username}/Collections/${col}`)))
      .then(() => { liveCollections = []; }));
};
