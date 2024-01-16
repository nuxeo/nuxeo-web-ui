Feature: Cloud Services

  Cloud providers can be added, edit and removed.
  Cloud clients can be added, edit and removed.

  Background:
    Given I login as "Administrator"

  Scenario: View cloud providers page
    Given I am on cloud services page
    Then I can see the nuxeo-cloud-providers page

  Scenario: Create new cloud provider
    Given I am on cloud services page
    Then I can add the following provider:
      | name                    | value                 |
      | serviceName             | New Provider          |
      | description             | New Description       |
      | clientId                | New Client Id         |
      | clientSecret            | New Client Secret     |
      | authorizationServerURL  | http://newauthserver  |
      | scopes                  | One new scope, Other  |
    And I can see "New Provider" provider

  Scenario: Edit a cloud provider
    Given provider "Existing Provider" exists in providers
    And I am on cloud services page
    Then I can edit "Existing Provider" provider to:
      | name                    | value                    |
      | serviceName             | Super Provider           |
      | description             | Super Description        |
      | clientId                | Super Id                 |
      | clientSecret            | Super Secret             |
      | authorizationServerURL  | http://superauthserver   |
      | scopes                  | One super scope, super   |
    And I can see "Super Provider" provider
    And I cannot see "Existing Provider" provider

  Scenario: Delete a cloud provider
    Given provider "Existing Provider" exists in providers
    And I am on cloud services page
    And I can delete "Existing Provider" provider
    And I cannot see "Existing Provider" provider

  Scenario: View full oauth2 tokens list
    Given I am on cloud services page
    When I click the "tokens" pill
    Then I can see the nuxeo-cloud-tokens page

  Scenario: View oauth2 tokens authorized application list
    Given I am on cloud services page
    When I click the "tokens" pill
    Then I can see the nuxeo-oauth2-provided-tokens table

  Scenario: View oauth2 tokens cloud account list
    Given I am on cloud services page
    When I click the "tokens" pill
    Then I can see the nuxeo-oauth2-consumed-tokens table

  Scenario: View cloud consumers page
    Given I am on cloud services page
    When I click the "consumers" pill
    Then I can see the nuxeo-cloud-consumers page

  Scenario: Create new cloud client
    Given I am on cloud services page
    When I click the "consumers" pill
    Then I can add the following client:
      | name                    | value                                         |
      | id                      | New Client Id                                 |
      | name                    | New Client                                    |
      | secret                  | New Client Secret                             |
      | redirectURIs            | https://newauthserver,nuxeo://newauthserver2  |
    And I can see "New Client Id" client

  Scenario: Edit a cloud client
    Given Client "Existing Client Id" exists in clients
    And I am on cloud services page
    When I click the "consumers" pill
    Then I can edit "Existing Client Id" client to:
      | name                    | value                                          |
      | id                      | Updated Client Id                              |
      | name                    | Updated Client                                 |
      | secret                  | Updated Client Secret                          |
      | redirectURIs            | https://updatedauthserver                      |
    And I can see "Updated Client Id" client
    And I cannot see "Existing Client Id" client

  Scenario: Delete a cloud client
    Given Client "Existing Client Id" exists in clients
    And I am on cloud services page
    When I click the "consumers" pill
    Then I can delete "Existing Client Id" client
    And I cannot see "Existing Client Id" client
