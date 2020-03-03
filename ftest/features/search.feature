Feature: Search

  Background:
    Given I have the following groups
      | name       | label      |
      | managers   | Managers   |
      | accounting | Accounting |
      | marketing  | Marketing  |
    And I have the following users
      | username | firstname | lastname | email           | group      |
      | JSmith   | John      | Smith    | JSmith@test.com | managers   |
      | SJones   | Susan     | Jones    | SJones@test.com | accounting |
      | BJones   | Bob       | Jones    | BJones@test.com | marketing  |
    And I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
      | Workspace  | Test_Workspace   | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
      | Workspace  | My_Workspace     | booklet | sciences/astronomy      | europe/Portugal      | SJones  | /default-domain                 |                  |        |            |
      | Workspace  | Nuxeo_Workspace  | memo    | sciences/astronomy      | europe/France        | JSmith  | /default-domain                 |                  |        |            |
      | Collection | Test_Collection  | booklet | sciences/astronomy      | north-america/Canada | JSmith  | /default-domain                 |                  |        |            |
      | Collection | My_Collection    | invoice | sciences/astronomy      | north-america/Canada | SJones  | /default-domain                 |                  |        |            |
      | Collection | Nuxeo_Collection | booklet | sciences/astronomy      | north-america/Canada | BJones  | /default-domain                 |                  |        |            |
      | Folder     | Test_Folder      | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/Nuxeo_Workspace | My_Collection    | tag    |            |
      | Folder     | My_Folder        | booklet | sciences/astronomy      | europe/Portugal      | SJones  | /default-domain/Test_Workspace  | My_Collection    | hello  |            |
      | Folder     | Nuxeo_Folder     | memo    | society/ecology         | europe/Portugal      | SJones  | /default-domain/My_Workspace    | Test_Collection  | hello  |            |
      | Note       | Test_Note        | invoice | society/ecology         | europe/France        | JSmith  | /default-domain/Nuxeo_Workspace | Nuxeo_Collection | urgent |            |
      | Note       | My_Note          | memo    | society/ecology         | europe/France        | BJones  | /default-domain/Test_Workspace  | Nuxeo_Collection | urgent |            |
      | Note       | Nuxeo_Note       | booklet | society/ecology         | europe/France        | SJones  | /default-domain/Test_Workspace  | Nuxeo_Collection | urgent |            |
      | File       | Test_File        | booklet | art/culture             | europe/France        | SJones  | /default-domain/Nuxeo_Workspace | My_Collection    | urgent | sample.png |
      | File       | My_File          | memo    | art/culture             | europe/France        | SJones  | /default-domain/My_Workspace    | Nuxeo_Collection | urgent | sample.png |
      | File       | Nuxeo_File       | invoice | art/culture             | europe/France        | BJones  | /default-domain/My_Workspace    | Test_Collection  | urgent | sample.mp4 |
    And user "John" exists in group "members"
    And I login as "John"

  Scenario Outline: Default Search
    When I click the "defaultSearch" button
    And I perform a <searchType> search for <searchTerm> on defaultSearch
    Then I can see <resultsCount> search results
    Examples:
    | searchType  | searchTerm              | resultsCount |
    | fulltext    | Lorem Ipsum             | 3            |
    | authors     | Bob                     | 5            |
    | collections | Nuxeo_Collection        | 4            |
    | tags        | urgent                  | 6            |
    | nature      | Booklet                 | 8            |
    | subject     | Society/Ecology         | 4            |
    | coverage    | Europe/Portugal         | 5            |
    #| size        | Between 100 KB and 1 MB | 1            | disabled until scroll works in shadow dom

  Scenario: Default Saved Search
    When I click the "defaultSearch" button
    And I perform a coverage search for Europe/France on defaultSearch
    Then I edit the results columns to show Subjects
    And I save my search as "Local Search"
    And I share my "defaultSearch" search with JSmith
    When I logout
    And I login as "JSmith"
    And I click the "defaultSearch" button
    Then I can view my saved search "Local Search" on "defaultSearch"

  Scenario: Navigate to Default Saved Search by ID
    Given I have a saved search named "Portugal", for the "default_search" page provider, with the following parameters
      | key             | value               |
      | dc_coverage_agg | ["europe/Portugal"] |
    And I have permission Read for this saved search
    When I browse to the saved search
    Then I can see 5 search results
    When I click the "defaultSearch" button
    Then I can see that my saved search "Portugal" on "defaultSearch" is selected

  Scenario Outline: Quick Search
    When I click the QuickSearch button
    And I perform a QuickSearch for <searchTerm>
    Then I can see <numberOfResults> QuickSearch results
    Examples:
    | searchTerm | numberOfResults |
    | Susan      | 1               |
    | Jones      | 2               |
    | BJones     | 1               |
    | managers   | 1               |
    | Test       | 5               |

  Scenario: Test Search
    When I click the "test_search" button
    And I perform a author search for Bob on test_search
    Then I can see 5 search results
    When I clear the author search on test_search
    Then I can see more than 5 search results

  Scenario: Manual Search Fulltext
    When I click the "manualSearch" button
    And I perform a fulltext search for hello on manualSearch
    Then I can see 2 search results

  Scenario: Plural Term Full Text Search
    Given I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
      | Workspace  | Dictionaries     | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                 |                  |        |            |
    When I click the "defaultSearch" button
    And I perform a fulltext search for dictionary on defaultSearch
    Then I can see 1 search results
