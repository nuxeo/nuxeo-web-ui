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
      | name                  | value                                                                           |
      | title                 | myMultiStringDoc                                                                |
      | multiString           | [{"string": "toto"}, {"string": "pouet"}, {"string": "foo"}, {"string": "bar"}] |
    And I can see MultiString metadata with the following properties:
      | name                  | value                                |
      | multiString           | [["toto"],["pouet"],["foo"],["bar"]] |

  # NXP-28141 is preventing this test from passing with a non-Admin user
  Scenario: Create and Edit Document with a multi complex property having vocabulary, document and user suggestion widget
    When I click the Create Document button
    And I select MultiComplex from the Document Type menu
    And I create a document with the following properties:
      | name                  | value                                                                                                                                                        |
      | title                 | myMultiComplexDoc                                                                                                                                            |
      | multiComplex          | [{"name": "first", "nature": "Training application", "document": "my document", "user": "Administrator"},{"name": "second", "nature": "Medical certificate"}] |
    And I can see MultiComplex metadata with the following properties:
      | name                  | value                                                                                        |
      | multiComplex          | [["first","Training application","my document","Administrator"],["second","Medical certificate"]] |
