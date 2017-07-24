'use strict';

module.exports = function () {
  this.Given('provider "$provider" exists in providers', (provider) => fixtures.providers.create({
    'entity-type': 'nuxeoOAuth2ServiceProvider',
    serviceName: provider,
  }));

  this.Then('I can see the nuxeo-cloud-providers page', () =>
    this.ui.administration.cloudServices.nuxeoCloudProviders.waitForVisible().should.be.true);

  this.Then('I can see the nuxeo-cloud-tokens page', () =>
    this.ui.administration.cloudServices.nuxeoCloudTokens.waitForVisible().should.be.true);

  this.Then('I can add the following provider:', (provider) => {
    this.ui.administration.cloudServices.addProvider(provider);
    global.providers[provider.rows()[0][1]] = {
      serviceName: provider.rows()[0][1],
    };
  });

  this.Then('I can see "$name" provider', (name) => {
    this.ui.administration.cloudServices.waitForHasProvider(name).should.be.true;
  });

  this.Then('I cannot see "$name" provider', (name) => {
    this.ui.administration.cloudServices.waitForHasProvider(name, true).should.be.true;
  });

  this.Then('I can edit "$currentName" provider to:', (currentName, newDetails) => {
    this.ui.administration.cloudServices.editProvider(currentName, newDetails);
    delete global.providers[currentName];
    global.providers[newDetails.rows()[0][1]] = {
      serviceName: newDetails.rows()[0][1],
    };
  });

  this.Then('I can delete "$name" provider', (name) => {
    this.ui.administration.cloudServices.deleteProvider(name);
    delete global.providers[name];
  });

  this.When('I click the "$name" pill', (name) => {
    this.ui.administration.cloudServices.clickElementName(name);
  });
};
