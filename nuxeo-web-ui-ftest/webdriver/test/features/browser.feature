Feature: Browser

  I can browse the repository

  Background:
    When I login as "Administrator"
    And I go to the UI

  Scenario: Browse
    When I click the "browser" button
    Then I can see the browser
