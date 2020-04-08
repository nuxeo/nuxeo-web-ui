Feature: Create Video

  I can create a Video document

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document

  Scenario: Create and Edit Video Document
    When I click the Create Document button
    And I select Video from the Document Type menu
    And I create a document with the following properties:
      | name         | value              |
      | title        | my title           |
      | description  | my description     |
      | content      | sample.mp4           |
      | nature       | Booklet            |
      | subjects     | Ecology,Gardening  |
    Then I see the Video page
    And I can see Video metadata with the following properties:
      | name         | value                                |
      | title        | my title                             |
      | description  | my description                       |
      | nature       | Booklet                              |
      | subjects     | Society/Ecology,Daily life/Gardening |
    And I can see the inline nuxeo-video-viewer previewer
    And I can see the video conversions panel
    When I can edit the following properties in the Video metadata:
      | name         | value                  |
      | title        | my edited title        |
      | description  | my edited description  |
      | nature       | Report                 |
      | subjects     | Fashion,Humanitarian   |
      | coverage     | Benin                  |
    Then I see the Video page    
    And I can see Video metadata with the following properties:
      | name         | value                                   |
      | title        | my edited title                         |
      | description  | my edited description                   |
      | nature       | Report                                  |
      | subjects     | Daily life/Fashion,Society/Humanitarian |  
      | coverage     | Africa/Benin                            |
    And I can see the video storyboard    

