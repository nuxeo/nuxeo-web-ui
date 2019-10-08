@itest
Feature: Tag search

  Background:
    Given I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | path                         | tag    |
      | Workspace  | My_Workspace     | booklet | sciences/astronomy      | europe/Portugal      | /default-domain              |        |
      | Folder     | My_Folder        | booklet | sciences/astronomy      | europe/Portugal      | /default-domain/My_Workspace | hello  |
      | Note       | My_Note          | memo    | society/ecology         | europe/France        | /default-domain/My_Folder    | hello  |
      | Note       | Your_Note        | booklet | society/ecology         | europe/France        | /default-domain/My_Folder    | urgent |
    And I login as "Administrator"

  Scenario: Manual Search Fulltext
    When I click the "manualSearch" button
    And I perform a fulltext search for hello on manualSearch
    Then I can see 2 search results
