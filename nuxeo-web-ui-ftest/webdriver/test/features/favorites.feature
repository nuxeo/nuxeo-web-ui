Feature: Favorites

  Background:
    When I login as "Administrator"
    And I go to the UI

  @ignore
  Scenario: Favorites
    When I click the "favorites" button
    Then I can see the list of favorites
