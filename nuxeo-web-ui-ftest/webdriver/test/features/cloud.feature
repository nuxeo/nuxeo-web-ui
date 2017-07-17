Feature: Cloud Services

  Cloud providers can be added, edit and removed.

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

  Scenario: View oauth tokens list
    Given I am on cloud services page
    When I click the "tokens" pill
    Then I can see the nuxeo-cloud-tokens page
