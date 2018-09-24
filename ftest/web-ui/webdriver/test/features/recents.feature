Feature: Recents

  I can view recent documents

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have the following documents
      | doctype   | title | nature  | subjects           | coverage        | creator | path               | collections | tag | file |
      | Workspace | ws    | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain    |             |     |      |
      | File      | file  | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/ws |             |     |      |
    And I have the following permissions to the documents
      | permission | path                    |
      | ReadWrite  | /default-domain/ws      |
      | ReadWrite  | /default-domain/ws/file |

  Scenario: Document is added to Recently Viewed list when it's viewed
    Given I browse to the document with path "/default-domain/ws"
    And I browse to the document with path "/default-domain/ws/file"
    When I click the "recents" button
    Then I can see the list of recently viewed documents has "2" items
    And I can see the list of recently viewed documents has "ws" document
    And I can see the list of recently viewed documents has "file" document
    And I have a clean recently viewed documents list

  Scenario: Document is removed from Recently Viewed list when it's deleted
    Given I browse to the document with path "/default-domain/ws"
    And I browse to the document with path "/default-domain/ws/file"
    When I click the "recents" button
    Then I can see the list of recently viewed documents has "2" items
    When I can trash current document
    Then I can see the list of recently viewed documents has "1" items
    And I can see the list of recently viewed documents has "ws" document
    And I have a clean recently viewed documents list
