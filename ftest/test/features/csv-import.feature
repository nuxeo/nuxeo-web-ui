Feature: CSV Import

  I can import documents with CSV

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document

  Scenario: Create document with CSV import
    When I click the Create Document button
    And I select the CSV tab
    And I upload the CSV file
