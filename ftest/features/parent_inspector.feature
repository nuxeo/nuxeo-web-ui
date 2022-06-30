@watch
Feature: Parent Inspector

Background:
    Given user "John" exists in group "members"
    And user "Susan" exists in group "powerusers"
    And I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |

Scenario: I can see parent inspector information for a document as Administrator
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can open parent inspector information
    And I can see dialog showing the parent inspector information for a given document

Scenario: I cannot see parent inspector information for trashed items
    Given I have the following trashed documents
      | doctype       | title            | path                     |
      | File          | TrashedFile      | /default-domain/ws       |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can navigate to trash pill
    When I select the "TrashedFile" document
    Then I cannot open parent inspector information


Scenario: I cannot see full parent inspector information as Power user
    When I login as "Susan"
    And I browse to the document with path "/default-domain/ws"
    Then I can open parent inspector information
    And I can see dialog showing partial parent inspector information for a given document

Scenario: I cannot see parent inspector information as a member
    When I login as "John"
    And I browse to the document with path "/default-domain/ws"
    Then I cannot open parent inspector information