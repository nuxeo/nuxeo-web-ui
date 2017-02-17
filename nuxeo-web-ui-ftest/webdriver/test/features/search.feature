Feature: Search

  Background:
    Given I login as "Administrator"

  Scenario: Search
    When I click the "defaultSearch" button
    Then I can see the "default" search panel
    And I cannot see the search results
