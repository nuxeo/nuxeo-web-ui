Feature: Create Document

  I can create a Document

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document

  Scenario Outline: Create <doctype>
    When I click the Create Document button
    And I select <doctype> from the Document Type menu
    And I create a document with the following properties:
      | name         | value             |
      | title        | my title          |
      | description  | my description    |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
      | expired      | February 28, 2018 |

    Then I see the <doctype> page
    And I can see <doctype> metadata with the following properties:
      | name         | value                            |
      | title        | my title                         |
      | description  | my description                   |
      | nature       | Application                      |
      | subjects     | Daily life/Gastronomy,Art/Comics |
      | expired      | February 28, 2018                |

  Examples:
    | doctype    |
    | Note       |
    | File       |
    | Folder     |
    | Workspace  |
    | Collection |

  Scenario: Create a File document using dropzone with legacy API
    When I click the Create Document button
    And I select LegacyFile from the Document Type menu
    And I create a document with the following properties:
      | name         | value              |
      | title        | my title           |
      | description  | my description     |
      | content      | sample.mp4         |
      | nature       | Booklet            |
      | subjects     | Ecology,Gardening  |
    Then I see the LegacyFile page
    And I can see LegacyFile metadata with the following properties:
      | name         | value                                |
      | title        | my title                             |
      | description  | my description                       |
      | nature       | Booklet                              |
      | subjects     | Society/Ecology,Daily life/Gardening |
    And I can see the inline nuxeo-video-viewer previewer
