Feature: Favorites

  Background:
    Given I login as "Administrator"

  Scenario: Favorites
    When I click the "favorites" button
    Then I can see the list of favorites
