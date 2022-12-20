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
