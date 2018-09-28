import nuxeo from '../services/client';

const { After } = require('cucumber');

After(() => nuxeo.request('/search/saved')
  .get()
  .then((res) => {
    const promises = [];
    res.entries.forEach((savedSearch) => {
      promises.push(nuxeo.repository().delete(savedSearch.id));
    });
    return Promise.all(promises);
  })
  .catch((error) => {
    throw new Error(error);
  }));
