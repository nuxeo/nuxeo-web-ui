Feature: Create Document

  I can view the Create Document Dialog

  Background:
    When I login as "Administrator"
    And I go to the UI

  Scenario: Open Create Dialog
    When I click the Create Document button
    Then I can see the Create Document dialog
