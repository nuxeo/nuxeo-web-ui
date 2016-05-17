Feature: Tasks

  Background:
    Given I login as "Administrator"

  Scenario: Tasks
    When I click the "tasks" button
    Then I can see the list of tasks
