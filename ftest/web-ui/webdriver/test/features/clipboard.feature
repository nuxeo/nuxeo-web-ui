Feature: Clipboard

  I can move and copy from clipboard

  Scenario Outline: <action> from clipboard
    Given I have the following documents
    | doctype    | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
    | Workspace  | Src              | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
    | Workspace  | Dest             | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
    | File       | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File       | File2            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File       | File3            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File       | File4            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    | File       | File5            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Src             |                  |        |            |
    And I login as "Administrator"
    When I browse to the document with path "/default-domain/Src"
    And I select all child documents
    Then I can see the selection toolbar
    And I can add selection to clipboard
    When I click the "clipboard" button
    Then I can see the clipboard has "5" items
    When I browse to the document with path "/default-domain/Dest"
    Then I can see the document has "0" children
    When I click the clipboard <action> action
    Then I can see the document has "5" children
    And I can see the clipboard has "0" items
    When I browse to the document with path "/default-domain/Src"
    Then I can see the document has "<srcNbDocs>" children

    Examples:
      | action  | srcNbDocs |
      | move    | 0         |
      | paste   | 5         |
