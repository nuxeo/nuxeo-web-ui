Feature: Authorized Applications

  As an Administrator I can manage authorized applications
  As a member user I have no authorized applications

  Background:

    Given I login as "Administrator"
    And the following OAuth2 clients exist
      | name             |
      | My Client        |
      | My Second Client |
    And I have tokens for the following OAuth2 clients
      | name             |
      | My Client        |
      | My Second Client |

  Scenario: View authorized applications    
    When I am on user authorized applications page
    Then I can only see 2 authorized applications

  Scenario: Revoke access to an authorized application
    When I am on user authorized applications page
    Then I can revoke access for "My Client" application
    And I can only see 1 authorized application

  Scenario: members cannot see authorized applications
    Given user "John" exists in group "members"
    And I login as "John" 
    When I am on user authorized applications page
    Then I cannot see authorized application
    