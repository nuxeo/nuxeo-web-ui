const {
  Given,
  Then,
  When,
} = require('cucumber');

Given('provider {string} exists in providers', function (provider) {
  return fixtures.providers.create({
    'entity-type': 'nuxeoOAuth2ServiceProvider',
    serviceName: provider,
  });
});

Then('I can see the nuxeo-cloud-providers page', function () {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudProviders.waitForVisible().should.be.true;
});

Then('I can see the nuxeo-cloud-tokens page', function () {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.nuxeoCloudTokens.waitForVisible().should.be.true;
});

Then('I can add the following provider:', function (provider) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.addProvider(provider);
  global.providers[provider.rows()[0][1]] = {
    serviceName: provider.rows()[0][1],
  };
});

Then('I can see {string} provider', function (name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.waitForHasProvider(name).should.be.true;
});

Then('I cannot see {string} provider', function (name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.waitForHasProvider(name, true).should.be.true;
});

Then('I can edit {string} provider to:', function (currentName, newDetails) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.editProvider(currentName, newDetails);
  delete global.providers[currentName];
  global.providers[newDetails.rows()[0][1]] = {
    serviceName: newDetails.rows()[0][1],
  };
});

Then('I can delete {string} provider', function (name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.deleteProvider(name);
  delete global.providers[name];
});

When('I click the {string} pill', function (name) {
  this.ui.administration.cloudServices.waitForVisible();
  this.ui.administration.cloudServices.clickElementName(name);
});
