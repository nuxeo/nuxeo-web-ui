Feature: Edit metadata

  I can edit metadata of a document

  Background:
    Given I login as "Administrator"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario Outline: Edit <doctype> metadata
    Given I have a <doctype> document
    When I browse to the document
    Then I can edit the following properties in the <doctype> metadata:
      | name         | value           |
      | title        | my title        |
      | description  | my description  |

  Examples:
    | doctype  |
    | Note     |
    | File     |
    | Folder   |
    | Workspace|
