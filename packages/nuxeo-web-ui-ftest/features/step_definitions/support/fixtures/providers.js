import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

const endPoint = '/oauth2/provider/';

global.providers = {};

fixtures.providers = {
  create: (provider) => {
    const { serviceName } = provider;
    const params = {};
    if (serviceName in global.providers) {
      return global.providers[serviceName];
    }
    return nuxeo
      .request(`${endPoint}${serviceName}`)
      .get()
      .then((_prov) => {
        global.providers[serviceName] = _prov;
        return _prov;
      })
      .catch((response) => {
        if (response.response && response.response.status && response.response.status === 404) {
          params.body = provider;
          return nuxeo
            .request(`${endPoint}`)
            .post(params)
            .catch((err) => {
              throw err;
            })
            .then((_prov) => {
              global.providers[serviceName] = _prov;
              return _prov;
            });
        }
        throw new Error(`unable to get provider "${serviceName}"`);
      });
  },
  delete: (provider) =>
    nuxeo
      .request(`${endPoint}${provider}`)
      .delete()
      .then(() => delete global.providers[provider]),
};

After(() => Promise.all(Object.keys(global.providers).map((provider) => fixtures.providers.delete(provider))));
