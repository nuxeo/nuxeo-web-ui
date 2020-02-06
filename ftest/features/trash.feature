Feature: Trash Management

  Scenario: Trash Search
    Given I have the following trashed documents
      | doctype       | title            | path                     |
      | File          | TrashedFile1     | /default-domain          |
      | File          | TrashedFile2     | /default-domain          |
    When I login as "Administrator"
    And I click the "trash" button
    When I perform a Trash Search for TrashedFile
    Then I can see 2 search results

  Scenario: I can trash documents
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
      | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
      | File          | File2            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    And I select the "File1" document
    And I select the "File2" document
    Then I can trash selected documents
    And I can navigate to trash pill
    And I can see 2 documents

  Scenario: I cannot trash documents
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
      | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
    And user "John" exists in group "members"
    And I login as "John"
    When I browse to the document with path "/default-domain/ws"
    And I select the "File1" document
    Then I cannot trash selected documents

  Scenario: I can untrash documents
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
    And I have the following trashed documents
      | doctype       | title            | path                     |
      | File          | TrashedFile1     | /default-domain/ws       |
      | File          | TrashedFile2     | /default-domain/ws       |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can navigate to trash pill
    And I can see 2 documents
    When I select the "TrashedFile1" document
    Then I can untrash selected documents
    And I can navigate to view pill
    And I can see 1 documents

  Scenario: I cannot untrash documents
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
    And I have the following trashed documents
      | doctype       | title            | path                     |
      | File          | TrashedFile1     | /default-domain/ws       |
    And user "John" exists in group "members"
    When I login as "John"
    And I browse to the document with path "/default-domain/ws"
    Then I can navigate to trash pill
    When I select the "TrashedFile1" document
    Then I cannot untrash selected documents

  Scenario: I can permanently delete documents
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
    And I have the following trashed documents
      | doctype       | title            | path                      |
      | File          | TrashedFile1     | /default-domain/ws        |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can navigate to trash pill
    When I select the "TrashedFile1" document
    Then I can permanently delete selected documents

  Scenario: I cannot permanently delete documents
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
    And I have the following trashed documents
      | doctype       | title            | path                      |
      | File          | TrashedFile1     | /default-domain/ws        |
    And user "John" exists in group "members"
    When I login as "John"
    And I browse to the document with path "/default-domain/ws"
    Then I can navigate to trash pill
    When I select the "TrashedFile1" document
    Then I cannot permanently delete selected documents

  Scenario: I can trash current document
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
      | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws/File1"
    Then I can trash current document

  Scenario: I cannot trash current document
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
      | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
    And user "John" exists in group "members"
    When I login as "John"
    And I browse to the document with path "/default-domain/ws/File1"
    Then I cannot trash current document

  Scenario: I can untrash current document
    Given I have a File document trashed
    When I login as "Administrator"
    And I browse to the document
    Then I can untrash current document

  Scenario: I cannot untrash current document
    Given I have a File document trashed
    And user "John" exists in group "members"
    When I login as "John"
    And I browse to the document
    Then I cannot untrash current document

  Scenario: I can permanently delete current document
    Given I have a File document trashed
    When I login as "Administrator"
    And I browse to the document
    Then I can permanently delete current document
    And I can see the "Domain" document
    And I am on the trash pill

  Scenario: I cannot permanently delete current document
    Given I have a File document trashed
    And user "John" exists in group "members"
    When I login as "John"
    And I browse to the document
    Then I cannot permanently delete current document

  Scenario: I can browse trash content
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
      | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    And I can trash current document
    And I can see the "Domain" document
    And I can navigate to trash pill
    Then I can see the document has 1 children
    Then I navigate to "ws" child
    Then I can see the document has 1 children
