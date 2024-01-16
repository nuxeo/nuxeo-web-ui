Feature: Nuxeo Grid

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario: Grid Layout
    And I browse to the document
    When I click the Create Document button
    And I select GridFile from the Document Type menu
    And I create a document with the following properties:
      | name         | value             |
      | title        | my title          |
      | description  | my description    |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
      | expired      | February 28, 2018 |
    Then I see the GridFile page
    And I can see GridFile metadata with the following properties:
      | name         | value                            |
      | title        | my title                         |
      | description  | my description                   |
      | nature       | Application                      |
      | subjects     | Daily life/Gastronomy,Art/Comics |
      | expired      | February 28, 2018                |

  Scenario: Grid Page
    When I have a GridFile document
    And This document has file "sample.png" for content
    And I browse to the document
    Then I see the GridFile page
    Then I can see the inline nuxeo-image-viewer previewer
    And I can see GridFile metadata with the following properties:
      | name         | value                            |
      | title        | my document                      |