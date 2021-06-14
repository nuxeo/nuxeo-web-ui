import { Given, Then, When } from '@cucumber/cucumber';

Given('provider {string} exists in providers', (provider) =>
  fixtures.providers.create({
    'entity-type': 'nuxeoOAuth2ServiceProvider',
    serviceName: provider,
  }),
);

Then('I can see the nuxeo-cloud-providers page', function() {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudProviders.waitForVisible().should.be.true;
});

Then('I can see the nuxeo-cloud-tokens page', function() {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudTokens.waitForVisible().should.be.true;
});

Then('I can see the nuxeo-oauth2-provided-tokens table', function() {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudTokensAuthorizedApplications.waitForVisible().should.be.true;
});

Then('I can see the nuxeo-oauth2-consumed-tokens table', function() {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudTokensCloudAccount.waitForVisible().should.be.true;
});

Then('I can add the following provider:', function(provider) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.addProvider(provider);
  global.providers[provider.rows()[0][1]] = {
    serviceName: provider.rows()[0][1],
  };
});

Then('I can see {string} provider', function(name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.waitForHasProvider(name).should.be.true;
});

Then('I cannot see {string} provider', function(name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.waitForHasProvider(name, true).should.be.true;
});

Then('I can edit {string} provider to:', function(currentName, newDetails) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.editProvider(currentName, newDetails);
  delete global.providers[currentName];
  global.providers[newDetails.rows()[0][1]] = {
    serviceName: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} provider', function(name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.deleteProvider(name);
  delete global.providers[name];
});

When('I click the {string} pill', function(name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.clickElementName(name);
});

Given('Client {string} exists in clients', (clientId) =>
  fixtures.clients.create({
    'entity-type': 'oauth2Client',
    id: clientId,
    name: 'Exiting Client',
    redirectURIs: ['nuxeo://authorize'],
  }),
);

Then('I can see the nuxeo-cloud-consumers page', function() {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudConsumers.waitForVisible().should.be.true;
});

Then('I can add the following client:', function(client) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.addClient(client);
  global.clients[client.rows()[0][1]] = {
    clientId: client.rows()[0][1],
  };
});

Then('I can see {string} client', function(clientId) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.waitForHasClient(clientId).should.be.true;
});

Then('I cannot see {string} client', function(clientId) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.waitForHasClient(clientId, true).should.be.true;
});

Then('I can edit {string} client to:', function(currentClientId, newDetails) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.editClient(currentClientId, newDetails);
  delete global.clients[currentClientId];
  global.clients[newDetails.rows()[0][1]] = {
    clientId: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} client', function(clientId) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.deleteClient(clientId);
  delete global.clients[clientId];
});
