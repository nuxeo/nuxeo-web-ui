@cleanupLocalStorage
Feature: Clipboard

  I can add, remove, move and copy items from/to the clipboard

  Background:
    Given I have the following documents
      | doctype   | title | nature  | subjects           | coverage        | creator | path                | collections | tag | file |
      | Workspace | Src   | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain     |             |     |      |
      | Workspace | Dest  | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain     |             |     |      |
      | File      | File1 | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/Src |             |     |      |
      | File      | File2 | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/Src |             |     |      |
      | File      | File3 | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/Src |             |     |      |
    And user "John" exists in group "members"
    And I login as "John"

  Scenario: Add documents to the clipboard
    Given I browse to the document with path "/default-domain/Src"
    And I select the "File1" document
    Then I can see the selection toolbar
    And I can add selection to clipboard
    When I click the "clipboard" button
    Then I can see the clipboard has 1 item
    And I can see the clipboard has "File1" document

  Scenario: Remove documents from the clipboard
    Given I browse to the document with path "/default-domain/Src"
    And I select the "File1" document
    And I can see the selection toolbar
    And I can add selection to clipboard
    When I click the "clipboard" button
    Then I can see the clipboard has "File1" document
    When I click remove button for "File1" document
    Then I can see the clipboard has 0 items

  Scenario Outline: <action> from clipboard
    Given I browse to the document with path "/default-domain/Src"
    And I select all child documents
    And I can see the selection toolbar
    And I can add selection to clipboard
    And I have the following permissions to the documents
      | permission | path                 |
      | ReadWrite  | /default-domain/Src  |
      | ReadWrite  | /default-domain/Dest |
    And I browse to the document with path "/default-domain/Dest"
    Then I can see the document has 0 children
    When I click the clipboard <action> action
    Then I can see the document has 3 children
    And I can see the clipboard has 0 items
    When I browse to the document with path "/default-domain/Src"
    Then I can see the document has <srcNbDocs> children

   Examples:
     | action | srcNbDocs |
     | move   | 0         |
     | paste  | 3         |

  Scenario: Can't use clipboard for destinations which don't allow certain types
    Given I browse to the document with path "/default-domain/Src"
    And I select the "File1" document
    And I can see the selection toolbar
    And I can add selection to clipboard
    When I browse to the document with path "/default-domain"
    Then I can see clipboard actions disabled

  Scenario: Clipboard is updated when document's title changes
    Given I have permission ReadWrite for the document with path "/default-domain/Src/File1"
    And I browse to the document with path "/default-domain/Src"
    And I select the "File1" document
    And I can see the selection toolbar
    And I can add selection to clipboard
    When I click the "clipboard" button
    Then I can see the clipboard has 1 item
    And I can see the clipboard has "File1" document
    When I browse to the document with path "/default-domain/Src/File1"
    Then I can edit the following properties in the File metadata:
      | name  | value    |
      | title | newTitle |
    And I see the File page
    When I click the "clipboard" button
    Then I can see the clipboard has 1 item
    And I can see the clipboard has "newTitle" document
