Feature: Create Picture and validate activity feed

  Background:
    Given I login as "Administrator"
    And I have a Workspace document
    And I browse to the document

  Scenario: Validate entries in activity tab
    When I click the Create Document button
    And I select File from the Document Type menu
    And I create a document with the following properties:
      | name         | value             |
      | title        | my title          |
      | description  | my description    |
      | content      | sample.png        |
      | nature       | Application       |
      | subjects     | Gastronomy,Comics |
    Then I see the File page
    When I reload the page
    And I can see "created the document" in the Activity feed
    Then I click the blob download button
    And I reload the page
    And I can see "downloaded the document" in the Activity feed
