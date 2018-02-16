Feature: Ordered Folder

  I can move documents up and down

  Scenario Outline: Move documents <direction>
    Given I have the following documents
    | doctype       | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
    | OrderedFolder | Src              | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
    | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File2            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File3            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File4            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File          | File5            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    And I login as "Administrator"
    When I browse to the document with path "/default-domain/Src"
    And I select the "File2" document
    And I select the "File4" document
    And I can move selection <direction>
    And I refresh the UI
    Then I can see the "File2" child document is at position "<newPosFile2>"
    And I can see the "File4" child document is at position "<newPosFile4>"

    Examples:
      | direction | newPosFile2 | newPosFile4 |
      | up        | 1           | 2           |
      | down      | 4           | 5           |
