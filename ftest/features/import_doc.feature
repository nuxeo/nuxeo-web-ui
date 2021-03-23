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
