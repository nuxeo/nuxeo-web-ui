Feature: Ordered Folder

  I can move documents up and down

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  # this test should fail. When NXP-27790 is fixed this should only pass with ReadWrite permission
  Scenario Outline: Move documents <direction>
    Given I have the following documents
    | doctype       | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
    | OrderedFolder | Src              | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
    | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File2            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File3            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File4            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File5            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    When I browse to the document with path "/default-domain/Src"
    And I select the "File2" document
    And I select the "File4" document
    And I can move selection <direction>
    And I reload the page
    Then I can see the "File2" child document is at position "<newPosFile2>"
    And I can see the "File4" child document is at position "<newPosFile4>"

    Examples:
      | direction | newPosFile2 | newPosFile4 |
      | up        | 1           | 2           |
      | down      | 4           | 5           |

  Scenario: Complex reordering
    Given I have the following documents
    | doctype       | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
    | OrderedFolder | Src              | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
    | File          | Apple            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Banana           | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Kiwi             | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Melon            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Orange           | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Kumquat          | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Avocado          | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Pear             | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | Grape            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    When I browse to the document with path "/default-domain/Src"
    And I select the "Melon" document
    And I select the "Kumquat" document
    And I select the "Pear" document
    And I can move selection down
    And I can move selection up
    And I deselect the "Kumquat" document
    And I select the "Orange" document
    And I deselect the "Melon" document
    And I can move selection down
    Then I can see the "Orange" child document is at position "8"
    And I can see the "Pear" child document is at position "9"
