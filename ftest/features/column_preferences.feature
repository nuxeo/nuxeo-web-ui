@cleanupLocalStorage
Feature: Content View Column Preferences

  Column customizations of a content view apply to every document of the same type

  Background:
    Given I have the following documents
      | doctype   | title      | nature  | subjects           | coverage        | creator | path                                | collections | tag | file |
      | Workspace | ColPrefsWs | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain                     |             |     |      |
      | Folder    | FolderA    | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/ColPrefsWs          |             |     |      |
      | Folder    | FolderB    | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/ColPrefsWs          |             |     |      |
      | File      | FileA      | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/ColPrefsWs/FolderA  |             |     |      |
      | File      | FileB      | booklet | sciences/astronomy | europe/Portugal | BJones  | /default-domain/ColPrefsWs/FolderB  |             |     |      |
    And user "ColPrefsUser" exists in group "members"
    And I login as "ColPrefsUser"

  Scenario: Column changes made in one folder apply to every folder
    When I browse to the document with path "/default-domain/ColPrefsWs/FolderA"
    Then I cannot see the "Nature" results column
    When I edit the results columns to show "Nature"
    And I browse to the document with path "/default-domain/ColPrefsWs/FolderB"
    Then I can see the "Nature" results column
    When I browse to the document with path "/default-domain/ColPrefsWs"
    Then I cannot see the "Nature" results column
    When I logout
    And I login as "ColPrefsUser"
    And I browse to the document with path "/default-domain/ColPrefsWs/FolderB"
    Then I can see the "Nature" results column
