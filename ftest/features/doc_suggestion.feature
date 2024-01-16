Feature: Document Suggestion

  I can edit single and multiple Document Suggestion Widgets

  Background:
    Given I have the following documents
      | doctype    | title | nature  | subjects                | coverage             | creator | path                            | collections      | tag    | file       |
      | Workspace  | toto  | booklet | sciences/astronomy      | europe/Belgium       | BJones  | /default-domain                 |                  |        |            |
      | Workspace  | pouet | booklet | sciences/astronomy      | europe/Germany       | SJones  | /default-domain                 |                  |        |            |
    And user "John" exists in group "members"
    And I login as "John"    
    And I have a Workspace document
    And I have permission ReadWrite for the document with path "/default-domain/toto"
    And I have permission ReadWrite for the document with path "/default-domain/pouet"
    And I browse to the document

  Scenario: Create and Edit Document with document suggestion widget
    When I click the Create Document button
    And I select DocSuggestion from the Document Type menu
    And I create a document with the following properties:
      | name                            | value             |
      | title                           | mySuggestionDoc   |
      | multipleDocSuggestion           | toto,pouet        |
      | singleDocSuggestion             | pouet             |
      | multipleDocSuggestionNoResolver | toto,pouet        |
    Then I see the DocSuggestion page
    And I can see DocSuggestion metadata with the following properties:
      | name                            | value             |
      | title                           | mySuggestionDoc   |
      | multipleDocSuggestion           | toto,pouet        |
      | singleDocSuggestion             | pouet             |
      | multipleDocSuggestionNoResolver | toto,pouet        |
    And I can navigate to the document selected in the "singleDocSuggestion" single document suggestion widget
