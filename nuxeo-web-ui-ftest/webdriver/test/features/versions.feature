Feature: Versioning

  Versions management in document view

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario: New version dialog
    Given I have a File document
    And I have permission ReadWrite for this document
    When I browse to the document
    And The document is unversioned
    And I click the Create Version button
    And The create version dialog appears
    And Version options 0.1 and 1.0 are presented
    And Dialog dismiss and confirm buttons are available
