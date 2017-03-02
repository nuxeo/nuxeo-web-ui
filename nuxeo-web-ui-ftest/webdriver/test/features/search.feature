Feature: Search

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Search
    When I click the "defaultSearch" button
    Then I can see the "default" search panel
    And I cannot see the search results
