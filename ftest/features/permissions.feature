Feature: Permissions

  Background:
    Given user "John" exists in group "members"
    And user "Bob" exists in group "members"
    And user "Susan" exists
    And I login as "Administrator"
    And I have a Note document
    And I browse to the document

  Scenario: Give a permission to user
    When I give Edit permission to "Susan" on the document
    Then I can see that "Susan" has the Edit permission
    When I logout
    And I login as "Susan"
    And I browse to the document
    Then I can see the "my document" document
    And I can edit the following properties in the Note metadata:
      | name  | value         |
      | title | changed title |
    And I see the Note page

  Scenario: Edit permission
    Given "Susan" has ReadWrite permission on the document
    When I browse to the document
    And I edit the Edit permission on the document for "Susan" to start tomorrow
    And I logout
    And I login as "Susan"
    Then I can't view the document

  Scenario: Give a permission to group
    Given "members" has ReadWrite permission on the document
    And I logout
    When I login as "John"
    And I browse to the document
    Then I can see the "my document" document
    And I can edit the following properties in the Note metadata:
      | name  | value         |
      | title | changed title |
    And I see the Note page
    And I can see Note metadata with the following properties:
      | name  | value         |
      | title | changed title |
    When I logout
    And I login as "Bob"
    And I browse to the document
    Then I can see the "changed title" document
    And I can edit the following properties in the Note metadata:
      | name  | value                 |
      | title | another changed title |
    And I see the Note page
    When I logout
    And I login as "Susan"
    Then I can't view the document

  Scenario: Set a permission to multiple users at the same time
    When I give Edit permission on the document to the following users:
      | name  |
      | John  |
      | Susan |
    Then I can see that "John" has the Edit permission
    And I can see that "Susan" has the Edit permission
