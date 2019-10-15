Feature: Internal Publication

  Background:
    Given I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
      | Section    | section1         | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/sections        |                  |        |            |
      | Section    | section2         | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/sections        |                  |        |            |
    And user "John" exists in group "members"

  Scenario: Publish Current Document Versions
    Given user "BJones" exists
    And I login as "BJones"
    And I have permission ReadWrite for the document with path "/default-domain/sections/section1"
    And I have permission ReadWrite for the document with path "/default-domain/sections/section2"
    And I have a File document
    And I have permission ReadWrite for this document
    When I browse to the document
    Then The document is unversioned
    When I click the Create Version button
    Then The create version dialog appears
    When I create a major version
    Then I can perform the following publications
      | target            | rendition | version | override |
      | section1          | None      | 1.0     |          |
    And I can navigate to publication pill
    And I can see the document has 1 publications
    And I can see the document has the following publication
       | path                                          | rendition | version |
       | /default-domain/sections/section1/my_document |           | 1.0     |
    When I browse to the document
    And This document has file "sample.png" for content
    Then I can perform the following publications
      | target            | rendition  | version | override |
      | section1          | None       |         |  true    |
    And I can navigate to publication pill
    And I can see the document has 1 publications
    And I can see the document has the following publication
       | path                                          | rendition  | version |
       | /default-domain/sections/section1/my_document |            | 1.1     |
    When I browse to the document
    Then I can perform the following publications
      | target            | rendition  | version | override |
      | section1          | XML Export | 1.0     |          |
      | section2          | Thumbnail  | 1.1     |          |
    And I can navigate to publication pill
    And I can see the document has 3 publications
    And I can see the document has the following publication
       | path                                          | rendition  | version |
       | /default-domain/sections/section1/my_document |            | 1.1     |
       | /default-domain/sections/section1/my_document | XML Export | 1.0     |
       | /default-domain/sections/section2/my_document | Thumbnail  | 1.1     |

  Scenario: Republish Current Document
    Given I login as "John"
    And I have permission ReadWrite for the document with path "/default-domain/sections/section1"
    And I have a File document
    When I browse to the document
    Then I can perform the following publications
      | target            | rendition | version | override |
      | section1          |           |         |          |
    And I can navigate to publication pill
    And I can see the document has 1 publications
    And I can see the document has the following publication
       | path                                          | rendition | version |
       | /default-domain/sections/section1/my_document |           | 0.1     |
    And This document has file "sample.png" for content
    When I browse to the document
    And I can navigate to publication pill
    Then I can republish the following publication
       | path                                          | rendition  | version |
       | /default-domain/sections/section1/my_document |            | 0.1     |
    And I can see the document has 1 publications
    And I can see the document has the following publication
      | path                                          | rendition | version |
      | /default-domain/sections/section1/my_document |           | 0.2     |

  Scenario: Publish Multiple Documents
    Given I login as "John"
    And I have the following documents
      | doctype    | title            | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
      | Workspace  | PublishTest      | booklet | sciences/astronomy      | europe/Portugal      | SJones  | /default-domain                 |                  |        |            |
      | File       | PublishFile      | invoice | society/ecology         | europe/France        | JSmith  | /default-domain/PublishTest     |                  | urgent |            |
      | Note       | PublishNote      | memo    | art/culture             | europe/France        | SJones  | /default-domain/PublishTest     |                  | urgent | sample.odt |  
    And I have permission ReadWrite for the document with path "/default-domain/PublishTest"
    And I have permission ReadWrite for the document with path "/default-domain/sections/section1"
    When I browse to the document with path "/default-domain/PublishTest"
    And I select the "PublishFile" document
    And I select the "PublishNote" document
    Then I can publish selection to "section1"
    When I browse to the document with path "/default-domain/sections/section1"
    Then I can see the document has 2 children
    When I navigate to "PublishFile" child
    Then I can see the document is a publication
    And I cannot see to publication pill
    And I can unpublish the document
    And I can see the document has 1 children

  Scenario: Read Only Publications
    Given user "Susan" exists in group "members"
    And I login as "John"  
    And I have permission ReadWrite for the document with path "/default-domain/sections/section1"  
    And I have a File document
    When I browse to the document
    Then I can perform the following publications
      | target            | rendition | version | override |
      | section1          |           |         |          |
    When I logout
    And I login as "Susan"
    When I browse to the document
    Then I can navigate to publication pill
    And I can see the document has 1 publications
    And I can see the document has the following publication
      | path                                          | rendition | version |
      | /default-domain/sections/section1/my_document |           | 0.1     |
