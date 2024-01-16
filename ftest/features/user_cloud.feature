Feature: User Cloud Services

  Users can manage their OAuth2 provider tokens.

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And the following OAuth2 providers exist
      | name                   |
      | test-oauth2-provider   |
      | test-oauth2-provider-2 |
    And I have tokens for the following OAuth2 providers
      | name                   |
      | test-oauth2-provider   |
      | test-oauth2-provider-2 |

  Scenario: View provider tokens
    When I am on user cloud services page
    Then I can only see 2 provider tokens that belong to me

  Scenario: Delete a provider token
    When I am on user cloud services page
    Then I can delete token for provider "test-oauth2-provider" that belongs to me
    And I can only see 1 provider token that belongs to me
