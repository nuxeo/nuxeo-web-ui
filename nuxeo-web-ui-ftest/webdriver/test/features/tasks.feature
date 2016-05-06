Feature: Tasks

  Background:
    When I login as "Administrator"
    And I go to the UI

  @ignore
  Scenario: Tasks
    When I click the "tasks" button
    Then I can see the list of tasks
