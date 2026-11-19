Feature: Expired Document

  Background:
   Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario Outline: Expired Document
    And I browse to the document
    When I click the Create Document button
    And I select File from the Document Type menu
    Then I create a document with the following properties:
      | name         | value             |
      | title        | File              |
      | description  | my description    |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
      | expired      | February 28, 2018 |
    When I click the "expiredSearch" button
    Then I can see the queue view on expiredSearch
    When I switch to filter view
    Then I can see the search criteria view on expiredSearch
    When I perform a fulltext search for File on expiredSearch
    Then I can see 1 search results
    When I switch to queue view
    Then I can see the queue view on expiredSearch
    When I switch to filter view
    Then I can see the search criteria view on expiredSearch
    And I can see 1 search results
