Feature: Tasks

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Tasks
    When I click the "tasks" button
    Then I can see the list of tasks
    And I can see the View Tasks Dashboard link
    When I click the View Tasks Dashboard link
    Then I can see the Tasks Dashboard
