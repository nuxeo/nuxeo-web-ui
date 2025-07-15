Feature: Spreadsheet

  I can use the Spreadsheet editor

  Background:
    Given I have the following documents
      | doctype    | title            | path                            |
      | Workspace  | Test Workspace     | /default-domain                 |
      | File       | Test File          | /default-domain/Test_Workspace    |
    And user "John" exists in group "members"
    And I login as "John"
    And I have permission ReadWrite for the document with path "/default-domain/Test_Workspace/Test_File"

  Scenario: Spreadsheet on folder content
    When I browse to the document with path "/default-domain/Test_Workspace"
    Then I can see the spreadsheet results actions button

  Scenario: Spreadsheet on search results
    When I click the "defaultSearch" button
    And I perform a fulltext search for "Test" on defaultSearch
    Then I can see 2 search results
    And I can see the spreadsheet results actions button

 Scenario: Spreadsheet columns
    Given I browse to the document with path "/default-domain/Test_Workspace"
    And I edit the results columns to show "Title"
    When I open the spreadsheet
    Then I can see the "Title" spreadsheet column

  Scenario: Spreadsheet edit
    Given I browse to the document with path "/default-domain/Test_Workspace"
    And I open the spreadsheet
    When I set the spreadsheet cell 0,0 to "New Title"
    And I save the spreadsheet
    And I close the spreadsheet
    Then I see "New Title" in the results table cell 0,0
    