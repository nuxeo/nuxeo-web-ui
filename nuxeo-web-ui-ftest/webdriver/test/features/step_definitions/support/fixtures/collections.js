import nuxeo from '../services/client'

global.liveCollections = [];

fixtures.collections = {
  addToNewCollection: (document, colName) => {
    return nuxeo.operation('Collection.Create').params({
      'name': colName
    }).execute().then((col) => {
      liveCollections.push(colName);
      return nuxeo.operation('Document.AddToCollection').input(document).params({
        'collection': col
      }).execute();
    });
  },
};

module.exports = function () {

  this.After(() => Promise.all(liveCollections
      .map((col) => nuxeo.repository().delete(`/default-domain/UserWorkspaces/Administrator/Collections/${col}`)))
      .then(() => { liveCollections = []; }));
};
