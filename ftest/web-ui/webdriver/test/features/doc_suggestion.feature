Feature: Document Suggestion

  I can edit single and multiple Document Suggestion Widgets

  Background:
    Given I login as "Administrator"
    And I click the "administration" button
    And I have a Workspace document
    And I browse to the document
    And I have the following documents
      | doctype    | title     |
      | File       | toto      |
      | File       | pouet     |

  Scenario Outline: Create and Edit Document with document suggestion widget
    When I click the Create Document button
    And I select DocSuggestion from the Document Type menu
    And I create a document with the following properties:
      | name                  | value             |
      | title                 | mySuggestionDoc   |
      | multipleDocSuggestion | toto,pouet        |
      | singleDocSuggestion   | pouet             |
    Then I see the DocSuggestion page
    And I can see DocSuggestion metadata with the following properties:
      | name                  | value             |
      | title                 | mySuggestionDoc   |
      | multipleDocSuggestion | toto,pouet        |
      | singleDocSuggestion   | pouet             |
