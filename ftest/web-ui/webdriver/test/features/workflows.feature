Feature: Workflows

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario Outline: I can start a default workflow
    Given I have a File document
    And I have permission ReadWrite for this document
    When I browse to the document
    And I start a <workflow>
    Then I can see a process is running in the document
    Examples:
      | workflow                  |
      | Parallel Document Review  |
      | Serial Document Review    |

  Scenario: I cannot start a workflow
    Given I have a File document
    When I browse to the document
    Then I cannot start a workflow

  Scenario: I can process a workflow and cancel
    Given I have a File document
    And This document has a "SerialDocumentReview" workflow running
    When I browse to the document
    Then I can see a process is running in the document
    When I click the process button
    Then I can process the workflow
    And I can perform the "cancel" task action
    And I browse to the document
    Then I can see a process is not running in the document

  Scenario: I can abandon a workflow
    Given I have a File document
    And This document has a "SerialDocumentReview" workflow running
    When I browse to the document
    Then I can see a process is running in the document
    And I can abandon the workflow
