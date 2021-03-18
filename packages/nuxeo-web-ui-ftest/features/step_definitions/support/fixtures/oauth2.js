/**
 * Provisioning of OAuth2 providers, clients and tokens via oauth2/directory rest endpoint
 */
import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';
import '../services/date';

global.oauth2Tokens = {};
const oauth2TokensDir = nuxeo.directory('oauth2Tokens');

global.oauth2Providers = {};
const oauth2ProvidersDir = nuxeo.directory('oauth2ServiceProviders');

global.oauth2Clients = {};
const oauth2ClientsDir = nuxeo.directory('oauth2Clients');

fixtures.oauth2Tokens = {
  create: (serviceName, clientId, nuxeoLogin, serviceLogin) =>
    oauth2TokensDir
      .create({
        properties: {
          serviceName,
          clientId,
          nuxeoLogin,
          serviceLogin,
          creationDate: moment(new Date()).format('YYYY-MM-DD HH:MM:SS'),
          expirationDate: '33029035368000',
        },
      })
      .then((entry) => {
        global.oauth2Tokens[entry.properties.id] = entry;
      }),
  delete: (entryId) => oauth2TokensDir.delete(entryId).then(() => delete global.oauth2Tokens[entryId]),
};

fixtures.oauth2Providers = {
  create: (name) =>
    oauth2ProvidersDir
      .create({
        properties: {
          serviceName: name,
          description: `${name} description`,
          clientId: name,
          clientSecret: 'secret',
          enabled: 'true',
        },
      })
      .then((entry) => {
        global.oauth2Providers[entry.properties.id] = entry;
      }),
  createToken: (name, user) => fixtures.oauth2Tokens.create(name, null, user, `${user}@some.email`),
  delete: (entryId) => oauth2ProvidersDir.delete(entryId).then(() => delete global.oauth2Providers[entryId]),
};

fixtures.oauth2Clients = {
  create: (name) =>
    oauth2ClientsDir
      .create({
        properties: {
          clientId: name,
          name,
        },
      })
      .then((entry) => {
        global.oauth2Clients[entry.properties.id] = entry;
      }),
  createToken: (name, user) => fixtures.oauth2Tokens.create('org.nuxeo.server.token.store', name, user, null),
  delete: (entryId) => oauth2ClientsDir.delete(entryId).then(() => delete global.oauth2Clients[entryId]),
};

After(() =>
  Promise.all([
    Promise.all(
      Object.keys(global.oauth2Providers).map((provider) => fixtures.oauth2Providers.delete(provider).catch(() => {})),
    ),
    Promise.all(
      Object.keys(global.oauth2Clients).map((client) => fixtures.oauth2Clients.delete(client).catch(() => {})),
    ),
    Promise.all(Object.keys(global.oauth2Tokens).map((token) => fixtures.oauth2Tokens.delete(token).catch(() => {}))),
  ]),
);
