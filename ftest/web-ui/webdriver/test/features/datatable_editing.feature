Feature: Multi-valued Properties Editing

  I can create and edit multi-valued properties

  Background:
    Given I login as "Administrator"
    And I click the "administration" button
    And I have a Workspace document
    And I browse to the document

  Scenario: Create and Edit Document with a multi string property
    When I click the Create Document button
    And I select MultiString from the Document Type menu
    And I create a document with the following properties:
      | name                  | value              |
      | title                 | myMultiStringDoc   |
      | multiString           | toto,pouet,foo,bar |
    And I can see MultiString metadata with the following properties:
      | name                  | value              |
      | multiString           | toto,pouet,foo,bar |
