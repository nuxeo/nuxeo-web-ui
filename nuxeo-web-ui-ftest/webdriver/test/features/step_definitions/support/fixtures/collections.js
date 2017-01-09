import nuxeo from '../services/client'

global.liveCollections = [];

fixtures.collections = {

};

module.exports = function () {

  this.After(() => Promise.all(liveCollections
      .map((col) => nuxeo.repository().delete(`/default-domain/UserWorkspaces/Administrator/Collections/${col}`)))
      .then(() => { liveCollections = []; }));
};
