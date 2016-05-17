Feature: Browser

  I can browse the repository

  Background:
    Given I login as "Administrator"

  Scenario: Browse
    When I click the "browser" button
    Then I can see the browser
