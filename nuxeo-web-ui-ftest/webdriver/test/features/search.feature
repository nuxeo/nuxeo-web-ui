Feature: Search

  Background:
    Given I login as "Administrator"

  Scenario: Search
    When I click the "default" search button
    Then I can see the Search window
