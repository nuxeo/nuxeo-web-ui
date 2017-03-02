Feature: Tasks

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Tasks
    When I click the "tasks" button
    Then I can see the list of tasks
