import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

fixtures.savedSearches = {
  create: (name, pageProvider, params) => {
    const body = {
      'entity-type': 'savedSearch',
      pageProviderName: pageProvider,
      params: {
        'cvd:contentViewName': pageProvider,
      },
      title: name,
    };
    Object.assign(body.params, params);
    return nuxeo.request('search/saved').post({ body });
  },
  setPermissions: (savedSearch, permission, username) =>
    nuxeo
      .operation('Document.AddPermission')
      .input(typeof savedSearch === 'string' ? savedSearch : savedSearch.id)
      .params({
        permission,
        username,
      })
      .execute(),
};

After(() =>
  nuxeo
    .request('/search/saved')
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
    }),
);
