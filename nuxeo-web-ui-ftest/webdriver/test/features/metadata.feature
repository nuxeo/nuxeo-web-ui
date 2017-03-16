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
      | name         | value                |
      | title        | my title             |
      | description  | my description       |
      | nature       | Internship report    |
      | subjects     | Medicine,Video games |
      | coverage     | Canada               |
      | expired      | 04-12-2082           |

    Then I see the <doctype> page
    And I can see <doctype> metadata with the following properties:
      | name         | value                |
      | title        | my title             |
      | description  | my description       |
      | nature       | Internship report    |
      | subjects     | Medicine,Video games |
      | coverage     | Canada               |
      | expired      | April 12, 2082       |

  Examples:
    | doctype  |
    | Note     |
    | File     |
    | Folder   |
    | Workspace|
