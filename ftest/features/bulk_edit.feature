Feature: Bulk Edit

  I can select all documents and edit all of them

  Background:
    Given I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | creator | path                                        | collections      | tag    | file       |
      | Workspace  | Test_Workspace   | booklet | art/culture             | europe/Portugal      | JSmith  | /default-domain                             |                  |        |            |
      | Folder     | Test_Folder      | booklet | art/culture             | europe/Portugal      | JSmith  | /default-domain/Test_Workspace/             |                  |        |            |
      | File       | First_File       | booklet | art/culture             | europe/Portugal      | JSmith  | /default-domain/Test_Workspace/Test_Folder/ |                  |        | sample.png |
      | File       | Second_File      | booklet | art/culture             | europe/Portugal      | JSmith  | /default-domain/Test_Workspace/Test_Folder/ |                  |        | sample.png |
      | File       | Third_File       | booklet | art/culture             | europe/Portugal      | JSmith  | /default-domain/Test_Workspace/Test_Folder/ |                  |        | sample.png |
    And I login as "Administrator"

  @config('selection.selectAllEnabled','true')
  Scenario: Select all documents and replace properties
    When I browse to the document with path "/default-domain/Test_Workspace/Test_Folder"
    And I can see the "Test_Folder" document
    Then I select all the documents
    And I can see the selection toolbar
    When I click the bulk edit button
    Then I can bulk edit multiple properties:
      | name         | value                | action    |
      | nature       |                      | remove    |
      | subjects     | Medicine             | replace   |
      | coverage     | Canada               | replace   |
    And I see a toast notification with the following message "Bulk Edit documents completed successfully on 3 document(s)"
    When I click the toast notification dismiss button
    And I browse to the document with path "/default-domain/Test_Workspace/Test_Folder/First_File"
    Then I can see File metadata with the following properties:
      | name         | value                |
      | nature       |                      |
      | subjects     | Medicine             |
      | coverage     | North-america/Canada |

  @config('selection.selectAllEnabled','true')
  Scenario: Select few documents and replace properties
    When I browse to the document with path "/default-domain/Test_Workspace/Test_Folder"
    And I can see the "Test_Folder" document
    Then I select the "First_File" document
    And I select the "Second_File" document
    And I can see the selection toolbar
    When I click the bulk edit button
    Then I can bulk edit multiple properties:
      | name         | value                | action    |
      | nature       |                      | remove    |
      | subjects     | Medicine             | replace   |
      | coverage     | Canada               | replace   |
    And I browse to the document with path "/default-domain/Test_Workspace/Test_Folder/First_File"
    Then I can see File metadata with the following properties:
      | name         | value                |
      | nature       |                      |
      | subjects     | Medicine             |
      | coverage     | North-america/Canada |
    Then I browse to the document with path "/default-domain/Test_Workspace/Test_Folder/Third_File"
    And I can see File metadata with the following properties:
      | name         | value                |
      | nature       | Booklet              |
      | subjects     | Art/Culture          |
      | coverage     | Europe/Portugal      |
