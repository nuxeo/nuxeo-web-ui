Feature: Tasks

  Background:
    Given user "John" exists in group "members"
    And user "Bob" exists in group "members"
    And user "Susan" exists
    And user "Joe" exists in group "administrators"

  Scenario: I can access Task Dashboard
    Given I login as "John"
    When I click the "tasks" button
    Then I can see the list of tasks
    And I can see the View Tasks Dashboard link
    When I click the View Tasks Dashboard link
    Then I can see the Tasks Dashboard

  Scenario: I can delegate a task
    Given I login as "John"
    And I have a File document
    And This document has a "SerialDocumentReview" workflow running
    When I browse to the document
    Then I can see a process is running in the document
    When I click the process button
    Then I can process the workflow
    And I can see the delegate option available
    When I delegate the task for following actors:
      | name  |
      | Bob   |
      | Susan |
    Then I can see that "Bob" belongs to delegated actors
    And I can see that "Susan" belongs to delegated actors
    When I logout
    And I login as "Bob"
    And I click the "tasks" button
    Then I can see the my task list has 1 item
    When I logout
    And I login as "Susan"
    And I click the "tasks" button
    Then I can see the my task list has 1 item

  Scenario: I cannot reassign a task
    Given I login as "John"
    And I have a File document
    And This document has a "SerialDocumentReview" workflow running
    When I browse to the document
    Then I can see a process is running in the document
    When I click the process button
    Then I can process the workflow
    And I can see the delegate option available
    But I can't see the reassign option available

  Scenario: I can reassign a task without Admin privileges
    Given I login as "Bob"
    And I have a File document
    And This document has a "SerialDocumentReview" workflow running
    And The workflow running for this document will proceed with "start_review" action and the following variables:
      | name               | value      | type |
      | participants       | Bob        | list |
      | validationOrReview | validation | text |
    And I browse to the document
    Then I can see a process is running in the document
    When I click the process button
    Then I can process the workflow
    And I can see the reassign option available
    When I reassign the task for following actors:
      | name  |
      | Susan |
    Then I can see the Tasks Dashboard
    When I logout
    And I login as "Susan"
    And I click the "tasks" button
    Then I can see the my task list has 1 item

  Scenario: I can reassign a task with Admin privileges
    Given I login as "Joe"
    And I have a File document
    And This document has a "SerialDocumentReview" workflow running
    And The workflow running for this document will proceed with "start_review" action and the following variables:
      | name               | value      | type |
      | participants       | Joe        | list |
      | validationOrReview | validation | text |
    And I browse to the document
    Then I can see a process is running in the document
    When I click the process button
    Then I can process the workflow
    And I can see the reassign option available
    When I reassign the task for following actors:
      | name |
      | Bob  |
    Then I can see that "Bob" belongs to assigned actors
    When I logout
    And I login as "Bob"
    And I click the "tasks" button
    Then I can see the my task list has 1 item
