Feature: Search

  Background:
    When I login as "Administrator"
    And I go to the UI

  Scenario: Search
    When I click the "defaultSearch" button
    Then I can see the Search window
