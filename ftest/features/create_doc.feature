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
    |doctype   |
    |Note      |
    |File      |
    |Folder    |
    |Workspace |
    |Collection|
