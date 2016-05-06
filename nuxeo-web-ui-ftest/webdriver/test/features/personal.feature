Feature: Personal Workspace

  Background:
    When I login as "Administrator"
    And I go to the UI

  @ignore
  Scenario: Personal Workspace
    When I click the "personalWorkspace" button
    Then I can see my personal workspace
