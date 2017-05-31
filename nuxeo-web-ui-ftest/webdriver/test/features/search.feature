Feature: Search

  Background:
  Given I have the following groups
    | name       | label      |
    | managers   | Managers   |
    | accounting | Accounting |
    | marketing  | Marketing  |
  And I have the following users
    | username | firstname | lastname | group      |
    | JSmith   | John      | Smith    | managers   |
    | SJones   | Susan     | Jones    | accounting |
    | BJones   | Bob       | Jones    | marketing  |
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
    And I login as "Administrator"
    And I click the "defaultSearch" button

  Scenario Outline: Full-text Search
    When I perform a fulltext search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm  | numberOfResults |
      | Lorem Ipsum | 3               |
      | Test        | 8               |

  Scenario Outline: Author Search
    When I perform a authors search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm  | numberOfResults |
      | Bob         | 5               |
      | Susan       | 7               |
      | John        | 3               |

  Scenario Outline: Collections Search
    When I perform a collections search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm       | numberOfResults |
      | My_Collection    | 3               |
      | Nuxeo_Collection | 4               |
      | Test_Collection  | 2               |

  Scenario Outline: Tags Search
    When I perform a tags search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm | numberOfResults |
      | tag        | 1               |
      | hello      | 2               |
      | urgent     | 6               |

  Scenario Outline: Nature Search
    When I perform a nature search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm | numberOfResults |
      | Booklet    | 8               |
      | Invoice    | 3               |
      | Memo       | 4               |

  Scenario Outline: Subjects Search
    When I perform a subject search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm         | numberOfResults |
      | Society/Ecology    | 4               |
      | Art/Culture        | 3               |
      | Science/Astronomy  | 8               |

  Scenario Outline: Coverage Search
    When I perform a coverage search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm           | numberOfResults |
      | North-america/Canada | 3               |
      | Europe/Portugal      | 5               |
      | Europe/France        | 7               |

  Scenario Outline: Size Search
    When I perform a size search for <searchTerm>
    Then I can see <numberOfResults> search results
    Examples:
      | searchTerm              | numberOfResults |
      | Less than 100 KB        | 2               |
      | Between 100 KB and 1 MB | 1               |
      | Between 1 MB and 10 MB  | 0               |

  Scenario: Saved Search
    When I perform a coverage search for Europe/France
    Then I edit the results columns to show Subjects
    And I save my search as "Local Search"
    And I share my search with JSmith
    When I logout
    And I login as "JSmith"
    And I click the "defaultSearch" button
    Then I can view my saved search "Local Search"

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