Feature: Retention

  As a Record Manager, I can set a document under retention

  Background:
    Given user "John" exists in group "RecordManager"
    And user "Jack" exists in group "members"

  Scenario: Retention Menu Permission
    When I login as "Administrator"
    Then I can see the retention menu
    And I logout
    When I login as "Jack"
    Then I cannot see the retention menu
    And I logout
    When I login as "John"
    Then I can see the retention menu

  Scenario: Immediate Manual Rule
    When I login as "John"
    And I go to the retention rules location
    When I click the Create Document button
    And I select RetentionRule from the Document Type menu
    And I create a document with the following properties:
      | name         | value             |
      | title        | ImmediateRule     |
      | startPolicy  | Immediate         |
      | years        | 1                 |
      | months       | 1                 |
      | days         | 1                 |
    Given I have a File document
    And This document has file "sample.png" for content
    And "John" has ManageRecord permission on the document
    And I browse to the document
    When I attach the "ImmediateRule" rule to the document
    Then I see the document is under retention
    And I cannot edit main blob

  Scenario: Metadata-based Manual Rule
    When I login as "John"
    And I go to the retention rules location
    When I click the Create Document button
    And I select RetentionRule from the Document Type menu
    And I create a document with the following properties:
      | name         | value               |
      | title        | DcExpiredRule       |
      | startPolicy  | Based on a metadata |
      | xpath        | dc:expired          |
      | years        | 1                   |
      | months       | 0                   |
      | days         | 0                   |
    Given I have a File document
    And This document has file "sample.png" for content
    And "John" has ManageRecord permission on the document
    And I browse to the document
    Then I can edit the following properties in the File metadata:
      | name    | value             |
      | expired | January 1, 2030   |
    When I attach the "DcExpiredRule" rule to the document
    Then I see the document is under retention
    And I cannot edit main blob

  Scenario: Event-based Manual Rule
    Given I have a "ContractEnd" retention event
    When I login as "John"
    And I go to the retention rules location
    When I click the Create Document button
    And I select RetentionRule from the Document Type menu
    And I create a document with the following properties:
      | name         | value               |
      | title        | ContractFooEnded    |
      | startPolicy  | Based on an event   |
      | event        | Contract End        |
      | eventInput   | foo                 |
      | years        | 0                   |
      | months       | 1                   |
      | days         | 0                   |
    Given I have a File document
    And This document has file "sample.png" for content
    And "John" has ManageRecord permission on the document
    And I browse to the document
    When I attach the "ContractFooEnded" rule to the document
    Then I see the document is under indeterminate retention
    And I cannot edit main blob
    When I go to the retention event
    And I fire the "Contract End" retention event with "bar" input
    And I browse to the document
    Then I see the document is under indeterminate retention
    When I go to the retention event
    And I fire the "Contract End" retention event with "foo" input
    And I browse to the document
    Then I see the document is under retention
