import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

const endPoint = '/oauth2/client/';

global.clients = {};

fixtures.clients = {
  create: (client) => {
    const clientId = client.id;
    const params = {};
    if (clientId in global.clients) {
      return global.clients[clientId];
    }
    return nuxeo
      .request(`${endPoint}${clientId}`)
      .get()
      .then((_client) => {
        global.clients[clientId] = _client;
        return _client;
      })
      .catch((response) => {
        if (response.response && response.response.status && response.response.status === 404) {
          params.body = client;
          return nuxeo
            .request(`${endPoint}`)
            .post(params)
            .catch((err) => {
              throw err;
            })
            .then((_client) => {
              global.clients[clientId] = _client;
              return client;
            });
        }
        throw new Error(`unable to get client "${clientId}"`);
      });
  },
  delete: (client) =>
    nuxeo
      .request(`${endPoint}${client}`)
      .delete()
      .then(() => delete global.clients[client]),
};

After(() => Promise.all(Object.keys(global.clients).map((client) => fixtures.clients.delete(client))));
