Feature: Server-side Validation

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document
    And I browse to the document
    And I click the Create Document button
    And I select Validation from the Document Type menu
    And I create a document with the following properties:
      | name         | value             |
      | title        | my title          |
      | letterOnly   | abc               |
      | firstNumber  | 1                 |
      | secondNumber | 9                 |
    Then I see the Validation page

  Scenario: Global validation violation
    Given I can edit the following properties in the Validation metadata:
      | name         | value             |
      | title        | my title          |
      | firstNumber  | 2                 |
      | secondNumber | 2                 |
    Then I can see 1 validation error in the "Validation" edit form
    And I can see the "Sum must be equal 10" error message in the "Validation" edit form


  Scenario: Field constraint validation violation
    Given I can edit the following properties in the Validation metadata:
      | name         | value             |
      | title        | my title          |
      | letterOnly   | abc12             |
    Then I can see 1 validation error in the "Validation" edit form
    And I can see the "'Letter Only' field can only contain letters" error message in the "Validation" edit form
