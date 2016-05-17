Feature: Create Document Dialog

  I can view the Create Document Dialog

  Background:
    Given I login as "Administrator"

  Scenario: Open Create Dialog
    When I click the Create Document button
    Then I can see the Create Document dialog
