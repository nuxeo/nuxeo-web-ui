import nuxeo from '../services/client';

module.exports = function () {
  this.After(() => nuxeo.request('/search/saved')
    .get()
    .then((res) => {
      res.entries.forEach((savedSearch) => {
        nuxeo.repository().delete(savedSearch.id);
      });
    })
    .catch((error) => {
      throw new Error(error);
    }));
};
