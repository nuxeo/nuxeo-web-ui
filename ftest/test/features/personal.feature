Feature: Personal Workspace

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Personal Workspace
    When I click the "personalWorkspace" button
    Then I can see my personal workspace
    When I click "John" in the personalWorkspace tree
    Then I can see the "John" document
