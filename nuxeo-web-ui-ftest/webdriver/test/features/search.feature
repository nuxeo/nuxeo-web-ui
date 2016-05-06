Feature: Search

  Background:
    When I login as "Administrator"
    And I go to the UI

  @ignore
  Scenario: Search
    When I click the "search" button
    Then I can see the Search window
