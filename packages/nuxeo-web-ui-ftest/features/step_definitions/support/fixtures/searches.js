import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client.js';

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
      .execute()
      // Granting a permission re-indexes the document's ACL in Elasticsearch asynchronously. The Web UI
      // lists saved searches from an ES-backed page provider, so navigating to the shared saved search
      // before its ACL is indexed makes it absent from the recipient's list — the form then falls back to
      // the default, unfiltered search and the wrong result count is shown. Block until pending indexing
      // is flushed and refreshed so the recipient reliably sees the shared search.
      .then(() =>
        nuxeo.operation('Elasticsearch.WaitForIndexing').params({ timeoutSecond: 60, refresh: true }).execute(),
      ),
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
    .catch(() => {}),
);
