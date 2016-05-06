Feature: Collections

  Background:
    When I login as "Administrator"
    And I go to the UI

  @ignore
  Scenario: Collections
    When I click the "collections" button
    Then I can see the list of collections
