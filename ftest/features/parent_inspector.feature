Feature: Parent Inspector

Background:
    Given user "John" exists in group "members"
    And user "Susan" exists in group "powerusers"
    And I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |

Scenario: I can see document information as Administrator
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can open current document information
    And I can see dialog showing the information for a given document
    And I can close the parent inspector dialog box

Scenario: I cannot see document information for trashed items
    Given I have the following trashed documents
      | doctype       | title            | path                     |
      | File          | TrashedFile      | /default-domain/ws       |
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can navigate to trash pill
    When I select the "TrashedFile" document
    Then I cannot open current document information


Scenario: I cannot see full information as Power user
    When I login as "Administrator"
    And I browse to the document with path "/default-domain/ws"
    Then I can open current document information
    And I can see dialog showing some information for a given document
    And I can close the parent inspector dialog box


Scenario: I cannot see document information as a member
    When I login as "John"
    And I browse to the document with path "/default-domain/ws"
    Then I cannot open current document information

    
    
   
       
    