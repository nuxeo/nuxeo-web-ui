Feature: Personal Workspace

  Background:
    Given I login as "Administrator"

  Scenario: Personal Workspace
    When I click the "personalWorkspace" button
    Then I can see my personal workspace
