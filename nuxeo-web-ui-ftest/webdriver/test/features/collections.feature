Feature: Collections

  Background:
    Given I login as "Administrator"

  Scenario: From browser, add document to a collection and remove it
    Given I have a HTML Note
    When I browse to the document
    Then I add it to the "MyCollection" collection
    And I can see the document belongs to the "MyCollection" collection
    And I can delete the document from the "MyCollection" collection
    And I can see the document does not belong to the "MyCollection" collection

  @watch
  Scenario: Browse collections
    Given I have a document added to "MyCollection" collection
    When I browse to the document
    Then I can see the document belongs to the "MyCollection" collection
