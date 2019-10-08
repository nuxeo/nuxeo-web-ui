@itest
Feature: Search with user suggestion

  Background:
    Given I have the following groups
      | name       | label      |
      | managers   | Managers   |
      | marketing  | Marketing  |
    And I have the following users
      | username | firstname | lastname | email           | group      |
      | JSmith   | John      | Smith    | JSmith@test.com | managers   |
      | BJones   | Bob       | Jones    | BJones@test.com | marketing  |
    And I have the following documents
      | doctype    | title            | creator | path                            |
      | Workspace  | Test_Workspace   | BJones  | /default-domain                 |
      | Workspace  | Nuxeo_Workspace  | JSmith  | /default-domain                 |
      | Folder     | Test_Folder      | BJones  | /default-domain/Nuxeo_Workspace |
      | Note       | Test_Note        | JSmith  | /default-domain/Nuxeo_Workspace |
      | Note       | My_Note          | BJones  | /default-domain/Test_Workspace  |
    And I login as "Administrator"

  Scenario: Test Search
    When I click the "test_search" button
    And I perform a author search for Bob on test_search
    Then I can see 3 search results
    When I clear the author search on test_search
    Then I can see more than 3 search results
