Feature: Bulk Edit with custom layouts

  Background:
    Given I have the following documents
      | doctype    | title              | path                                               |
      | Workspace  | Test_Workspace     | /default-domain                                    |
      | Folder     | Custom_Test_Folder | /default-domain/Test_Workspace/                    |
      | bulkedit   | Custom_First_File  | /default-domain/Test_Workspace/Custom_Test_Folder/ |
      | bulkedit   | Custom_Second_File | /default-domain/Test_Workspace/Custom_Test_Folder/ |
      | bulkedit   | Custom_Third_File  | /default-domain/Test_Workspace/Custom_Test_Folder/ |
    And I login as "Administrator"

  @config('selection.selectAllEnabled','true')
  Scenario: Select all documents in a custom layout and replace values
    When I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder"
    And I can see the "Custom_Test_Folder" document
    Then I select all the documents
    And I can see the selection toolbar
    When I click the bulk edit button with "bulkedit" layout
    Then I can bulk edit multiple properties in "bulkedit" layout:
      | name                  | value                                                                          | action  |
      | boolean               | true                                                                           | replace |
      | complexFirstString    | first string                                                                   | replace |
      | complexSecondString   | second string                                                                  | replace |
      | blob                  | sample.png                                                                     | replace |
      | complexTable          | [{"complexTableFirstString": "first"}, {"complexTableSecondString": "second"}] | replace |
    And I see a toast notification with the following message "Bulk Edit Assets completed successfully on 3 document(s)"
    When I click the toast notification dismiss button
    And I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder/Custom_First_File"
    Then I can see bulkedit metadata with the following properties:
      | name                | value                  |
      | boolean             | true                   |
      | complexFirstString  | first string           |
      | complexSecondString | second string          |
      | blob                | sample.png             |
      | complexTable        | [["first"],["second"]] |

  @config('selection.selectAllEnabled','true')
  Scenario: Select all documents in a custom layout and add values
    When I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder"
    And I can see the "Custom_Test_Folder" document
    Then I select all the documents
    And I can see the selection toolbar
    When I click the bulk edit button with "bulkedit" layout
    Then I can bulk edit multiple properties in "bulkedit" layout:
      | name         | value                                                                          | action    |
      | complexTable | [{"complexTableFirstString": "first"}, {"complexTableSecondString": "second"}] | addValues |
    And I see a toast notification with the following message "Bulk Edit Assets completed successfully on 3 document(s)"
    When I click the toast notification dismiss button
    And I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder/Custom_First_File"
    Then I can see bulkedit metadata with the following properties:
      | name         | value                  |
      | complexTable | [["first"],["second"]] |
    When I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder"
    And I can see the "Custom_Test_Folder" document
    Then I select all the documents
    And I can see the selection toolbar
    When I click the bulk edit button with "bulkedit" layout
    Then I can bulk edit multiple properties in "bulkedit" layout:
      | name         | value                                                                          | action    |
      | complexTable | [{"complexTableFirstString": "third"}, {"complexTableSecondString": "fourth"}] | addValues |
    And I see a toast notification with the following message "Bulk Edit Assets completed successfully on 3 document(s)"
    Then I click the toast notification dismiss button
    When I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder"
    And I browse to the document with path "/default-domain/Test_Workspace/Custom_Test_Folder/Custom_First_File"
    Then I can see bulkedit metadata with the following properties:
      | name         | value                                       |
      | complexTable | [["first"],["second"],["third"],["fourth"]] |
