import { Given, Then, When } from '../../node_modules/@cucumber/cucumber';

Given('provider {string} exists in providers', async (provider) =>
  fixtures.providers.create({
    'entity-type': 'nuxeoOAuth2ServiceProvider',
    serviceName: provider,
  }),
);

Then('I can see the nuxeo-cloud-providers page', async function() {
  const cloudServicesEle = await this.ui.administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const nuxeoCloudProvidersPage = await cloudServicesEle.nuxeoCloudProviders.waitForVisible();
  if (!nuxeoCloudProvidersPage) {
    throw new Error('Expected nuxeo-cloud-providers page not be visible');
  }
});

Then('I can see the nuxeo-cloud-tokens page', async function() {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const nuxeoCloudTokenPage = await cloudServicesEle.nuxeoCloudTokens.waitForVisible();
  if (!nuxeoCloudTokenPage) {
    throw new Error('Expected nuxeo-cloud-tokens page not be visible');
  }
});

Then('I can see the nuxeo-oauth2-provided-tokens table', async function() {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const nuxeoOauth2ProvidedEle = await cloudServicesEle.nuxeoCloudTokensAuthorizedApplications.waitForVisible();
  if (!nuxeoOauth2ProvidedEle) {
    throw new Error('Expected nuxeo-oauth2-provided-tokens table not be visible');
  }
});

Then('I can see the nuxeo-oauth2-consumed-tokens table', async function() {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const nuxeoOauth2ConsumedTokens = await cloudServicesEle.nuxeoCloudTokensCloudAccount.waitForVisible();
  if (!nuxeoOauth2ConsumedTokens) {
    throw new Error('Expected nuxeo-oauth2-consumed-tokens table not be visible');
  }
});

Then('I can add the following provider:', async function(provider) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.addProvider(provider);
  global.providers[provider.rows()[0][1]] = {
    serviceName: provider.rows()[0][1],
  };
});

Then('I can see {string} provider', async function(name) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const cloudServices = await cloudServicesEle.waitForHasProvider(name);
  if (!cloudServices) {
    throw new Error('Expected {string} provider to be visible');
  }
});

Then('I cannot see {string} provider', async function(name) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const existingProvider = await cloudServicesEle.waitForHasProvider(name, true);
  if (!existingProvider) {
    throw new Error('Expected {string} provider visible');
  }
});

Then('I can edit {string} provider to:', async function(currentName, newDetails) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.editProvider(currentName, newDetails);
  delete global.providers[currentName];
  global.providers[newDetails.rows()[0][1]] = {
    serviceName: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} provider', async function(name) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.deleteProvider(name);
  delete global.providers[name];
});

When('I click the {string} pill', async function(name) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.clickElementName(name);
});

Given('Client {string} exists in clients', async (clientId) =>
  fixtures.clients.create({
    'entity-type': 'oauth2Client',
    id: clientId,
    name: 'Exiting Client',
    redirectURIs: ['nuxeo://authorize'],
  }),
);

Then('I can see the nuxeo-cloud-consumers page', async function() {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const NuxeoCloudConsumersPage = await cloudServicesEle.nuxeoCloudConsumers;
  const NuxeoCloudConsumersPageIsVisible = await NuxeoCloudConsumersPage.waitForVisible();
  if (!NuxeoCloudConsumersPageIsVisible) {
    throw new Error('Expected nuxeo-cloud-consumers page not be visible');
  }
});

Then('I can add the following client:', async function(client) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.addClient(client);
  global.clients[await client.rows()[0][1]] = {
    clientId: client.rows()[0][1],
  };
});

Then('I can see {string} client', async function(clientId) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const newClientID = await cloudServicesEle.waitForHasClient(clientId);
  if (!newClientID) {
    throw new Error('Expected {string} client not be visible');
  }
});

Then('I cannot see {string} client', async function(clientId) {
  const administration = await this.ui.administration;
  const cloudServicesEle = await administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  const existingClientEle = await cloudServicesEle.waitForHasClient(clientId, true);
  if (!existingClientEle) {
    throw new Error('Expected {string} client be visible');
  }
});

Then('I can edit {string} client to:', async function(currentClientId, newDetails) {
  const cloudServicesEle = await this.ui.administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.editClient(currentClientId, newDetails);
  delete global.clients[currentClientId];
  global.clients[newDetails.rows()[0][1]] = {
    clientId: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} client', async function(clientId) {
  const cloudServicesEle = await this.ui.administration.cloudServices;
  await cloudServicesEle.waitForVisible();
  await cloudServicesEle.deleteClient(clientId);
  delete global.clients[clientId];
});
