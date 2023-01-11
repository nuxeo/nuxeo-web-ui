import { Given, Then, When } from '@cucumber/cucumber';

Given('provider {string} exists in providers', (provider) =>
  fixtures.providers.create({
    'entity-type': 'nuxeoOAuth2ServiceProvider',
    serviceName: provider,
  }),
);

Then('I can see the nuxeo-cloud-providers page',async function() {
  this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.nuxeoCloudProviders.waitForVisible();
  if (!isVisible) {
    throw new Error('Nuxeo cloud providers page to be visible');
  }
});

Then('I can see the nuxeo-cloud-tokens page',async function() {
  this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.nuxeoCloudTokens.waitForVisible();
  if (!isVisible) {
    throw new Error('Nuxeo cloud tokens page to be visible');
  }
});

Then('I can see the nuxeo-oauth2-provided-tokens table',async function() {
  this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.nuxeoCloudTokensAuthorizedApplications.waitForVisible();
  if (!isVisible) {
    throw new Error('Nuxeo oauth provided tokens page to be visible');
  }
});

Then('I can see the nuxeo-oauth2-consumed-tokens table',async function() {
  this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.nuxeoCloudTokensCloudAccount.waitForVisible();
  if (!isVisible) {
    throw new Error('Nuxeo oauth2 consumed tokens page to be visible');
  }
});

Then('I can add the following provider:',async function(provider) {
  await this.ui.administration.cloudServices.waitForVisible();
  await this.ui.administration.cloudServices.addProvider(provider);
  global.providers[provider.rows()[0][1]] = {
    serviceName: provider.rows()[0][1],
  };
});

Then('I can see {string} provider',async function(name) {
  await this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.waitForHasProvider(name);
  if (!isVisible) {
    throw new Error('provider to be visible');
  }
});

Then('I cannot see {string} provider',async function(name) {
  await this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.waitForHasProvider(name, true);
  if (!isVisible) {
    throw new Error('provider to be visible');
  }
});

Then('I can edit {string} provider to:',async function(currentName, newDetails) {
  await this.ui.administration.cloudServices.waitForVisible();
  await this.ui.administration.cloudServices.editProvider(currentName, newDetails);
  delete global.providers[currentName];
  global.providers[newDetails.rows()[0][1]] = {
    serviceName: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} provider',async function(name) {
  await this.ui.administration.cloudServices.waitForVisible();
  await this.ui.administration.cloudServices.deleteProvider(name);
  delete global.providers[name];
});

When('I click the {string} pill',async function(name) {
  await this.ui.administration.cloudServices.waitForVisible();
  await this.ui.administration.cloudServices.clickElementName(name);
});

Given('Client {string} exists in clients', (clientId) =>
  fixtures.clients.create({
    'entity-type': 'oauth2Client',
    id: clientId,
    name: 'Exiting Client',
    redirectURIs: ['nuxeo://authorize'],
  }),
);

Then('I can see the nuxeo-cloud-consumers page',async function() {
  await this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.nuxeoCloudConsumers.waitForVisible();
  if (!isVisible) {
    throw new Error('nuxeo cloud consumer page to be visible');
  }
});

Then('I can add the following client:',async function(client) {
  await this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.addClient(client);
  global.clients[client.rows()[0][1]] = {
    clientId: client.rows()[0][1],
  };
});

Then('I can see {string} client',async function(clientId) {
  await this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.waitForHasClient(clientId);
  if (!isVisible) {
    throw new Error('client to be visible');
  }
});

Then('I cannot see {string} client',async function(clientId) {
  await this.ui.administration.cloudServices.waitForVisible();
  const isVisible = await this.ui.administration.cloudServices.waitForHasClient(clientId, true);
  if (isVisible) {
    throw new Error('client to not be visible');
  }
});

Then('I can edit {string} client to:',async function(currentClientId, newDetails) {
  await this.ui.administration.cloudServices.waitForVisible();
  await this.ui.administration.cloudServices.editClient(currentClientId, newDetails);
  delete global.clients[currentClientId];
  global.clients[newDetails.rows()[0][1]] = {
    clientId: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} client',async function(clientId) {
  await this.ui.administration.cloudServices.waitForVisible();
  await this.ui.administration.cloudServices.deleteClient(clientId);
  delete global.clients[clientId];
});
