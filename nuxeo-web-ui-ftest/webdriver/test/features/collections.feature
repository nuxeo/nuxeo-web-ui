Feature: Collections

  Background:
    Given I login as "Administrator"

  Scenario: From browser, add document to a collection and remove it
    Given I have a HTML Note
    When I browse to the document
    Then I add the document to the "MyCollection" collection
    And I can see the document belongs to the "MyCollection" collection
    And I can delete the document from the "MyCollection" collection
    And I can see the document does not belong to the "MyCollection" collection

# Scenario: Browse collections
#   Given I have a document added to "MyCollection" collection
#   When I click the "collections" button
#   Then I can see the "MyCollection" collection
#   And I can click on the "MyCollection" collection
#   And I can see that the document belongs to the collection
#   And I can click the document in the collection
#   And I can see the collection is in queue mode
#   And I can see the collection queue has the document
#   And I can remove the document from the collection queue
#   And I can see the collection queue does not have the document
