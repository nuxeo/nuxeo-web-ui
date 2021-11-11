@watch
Feature: Bulk Edit

  I can select all documents and edit all of them

  Background:
    Given I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | creator | path                                        | collections      | tag    | file       |
      | Workspace  | Test_Workspace   | booklet | sciences/astronomy      | europe/Portugal      | JSmith  | /default-domain                             |                  |        |            |
      | Folder     | Test_Folder      | booklet | sciences/astronomy      | europe/Portugal      | JSmith  | /default-domain/Test_Workspace/             |                  |        |            |
      | File       | First_File       | booklet | art/culture             | europe/France        | JSmith  | /default-domain/Test_Workspace/Test_Folder/ |                  |        | sample.png |
      | File       | Second_File      | booklet | art/culture             | europe/France        | JSmith  | /default-domain/Test_Workspace/Test_Folder/ |                  |        | sample.png |
      | File       | Third_File       | booklet | art/culture             | europe/France        | JSmith  | /default-domain/Test_Workspace/Test_Folder/ |                  |        | sample.png |
    And I login as "Administrator"

  @config('selection.selectAllEnabled','true')
  Scenario: Select all documents and edit them
    When I browse to the document with path "/default-domain/Test_Workspace/Test_Folder"
    And I can see the "Test_Folder" document
    Then I select all the documents
    And I can see the selection toolbar
    When I click the edit button
    And I see a dialog with editing options
    Then I can edit multiple properties:
      | name         | value                |
      | nature       | Internship report    |
      | subjects     | Medicine             |
      | coverage     | Canada               |
    And I click the save button
    # Then I see a toast notification with the following message "Bulk Edit documents completed successfully on 3 document(s)"
    And I click the dismiss button
    When I browse to the document with path "/default-domain/Test_Workspace/Test_Folder/First_File"
    And I can see File metadata with the following properties:
      | name         | value                |
      | nature       | Internship report    |
      | subjects     | Medicine             |
      | coverage     | North-america/Canada |