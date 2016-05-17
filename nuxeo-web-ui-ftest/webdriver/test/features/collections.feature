Feature: Collections

  Background:
    Given I login as "Administrator"

  Scenario: Collections
    When I click the "collections" button
    Then I can see the list of collections
