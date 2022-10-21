Feature: Compare

  I can Compare the documents

  Background:
    Given I have the following documents
      | doctype    | title              | nature  | subjects    | coverage        | creator | path                                               | collections | tag    | file       |
      | Workspace  | Test_Workspace     | booklet | art/culture | europe/Portugal | JSmith  | /default-domain                                    |             |        |            |
      | Folder     | Test_Folder        | booklet | art/culture | europe/Portugal | JSmith  | /default-domain/Test_Workspace/                    |             |        |            |
      | File       | First_File         | booklet | art/culture | europe/Portugal | JSmith  | /default-domain/Test_Workspace/Test_Folder/        |             |        | sample.png |
      | File       | Second_File        | booklet | art/culture | europe/Portugal | JSmith  | /default-domain/Test_Workspace/Test_Folder/        |             |        | sample.png |
   And I login as "Administrator"

  Scenario: Select all documents and compare properties
    When I browse to the document with path "/default-domain/Test_Workspace/Test_Folder"
    And I can see the "Test_Folder" document
    Then I select the "First_File" document
    And I select the "Second_File" document
    When I can click on the compare button
    Then I can see compare document page is displayed
