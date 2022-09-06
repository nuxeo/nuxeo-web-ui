Feature: Import and Create Documents

    I can import and create a Document

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document

  Scenario: Import a Document without adding properties
    When I click the Create Document button
    Then I go to the import tab
    And I can see the import tab content
    And I upload the sample.png on the tab content page
    When I click the Create button to finish the import
    Then I can see that a document of the type Picture and title sample.png is created
    And I can see the inline nuxeo-image-viewer previewer
    And I can see the picture formats panel

  Scenario: Import 6 documents without adding properties
    When I click the Create Document button
    Then I go to the import tab
    And I can see the import tab content
    And I upload the following files on the tab content page:
      | value      |
      | sample.png |
      | sample.mp3 |
      | sample.mp4 |
      | sample.pdf |
      | sample.txt |
      | sample.odt |
    When I click the Create button to finish the import
    Then I can see 6 documents
    When I navigate to "sample.mp4" child
    Then I can see that a document of the type Video and title sample.mp4 is created
    And I can see the inline nuxeo-video-viewer previewer
    And I can see the video conversions panel

  Scenario: Import a Document with properties
    When I click the Create Document button
    Then I go to the import tab
    And I can see the import tab content
    And I upload the sample.png on the tab content page
    When I click on Add Properties button
    Then I select "Picture" asset type
    And I add the following properties:
      | name         | value             |
      | description  | my description    |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
      | expired      | December 28, 2022 |
    When I click the Create button to complete the import
    And I see a toast notification with the following message "Created Picture sample.png."
    Then I can see that a document of the type Picture and title sample.png is created
    And I can see Picture metadata with the following properties:
      | name         | value                            |
      | title        | sample.png                       |
      | description  | my description                   |
      | nature       | Application                      |
      | subjects     | Daily life/Gastronomy,Art/Comics |           
    And I can see the inline nuxeo-image-viewer previewer
    And I can see the picture formats panel

    Scenario: Import 6 documents with properties
    When I click the Create Document button
    Then I go to the import tab
    And I can see the import tab content
    And I upload the following files on the tab content page:
      | value      |
      | sample.png |
      | sample.mp3 |
      | sample.mp4 |
      | sample.pdf |
      | sample.txt |
      | sample.odt |
    When I click on Add Properties button
    Then I select "Picture" asset type
    And I add the following properties:
      | name         | value             |
      | description  | my description    |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
      | expired      | December 28, 2022 |
    And I click on Apply to all
    When I click the Create button to complete the import
    And I see a toast notification with the following message "Created 6 documents."
    Then I can see 6 documents
    When I navigate to "sample.png" child
    Then I can see that a document of the type Picture and title sample.png is created
    And I can see Picture metadata with the following properties:
      | name         | value                            |
      | title        | sample.png                       |
      | description  | my description                   |
      | nature       | Application                      |
      | subjects     | Daily life/Gastronomy,Art/Comics |     
    And I can see the inline nuxeo-image-viewer previewer
    And I can see the picture formats panel
