Feature: Collections

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a HTML Note
    And I browse to the document
    And I add the document to the "MyCollection" collection

  Scenario: From browser, add document to a collection and remove it
    Then I can see the document belongs to the "MyCollection" collection
    And I can delete the document from the "MyCollection" collection
    And I can see the document does not belong to the "MyCollection" collection

  Scenario: Browse collections
    When I click the "collections" button
    Then I can see the "MyCollection" collection
    And I can click on the "MyCollection" collection
    And I can see that the document belongs to the collection
    And I can click the document in the collection
    And I can see the collection is in queue mode
    And I can see the collection queue has the document
    And I can remove the document from the collection queue
    And I can see the collection queue does not have the document

  Scenario: Add documents to a collection
    Given I have the following documents
      | doctype       | title            | nature  | subjects                | coverage             | creator | path                              | collections      | tag    | file       |
      | Workspace     | ws               | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain                   |                  |        |            |
      | File          | File1            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
      | File          | File2            | booklet | sciences/astronomy      | europe/Portugal      | BJones  | /default-domain/ws                |                  |        |            |
    And I browse to the document with path "/default-domain/ws"
    And I select the "File1" document
    And I select the "File2" document
    Then I can add selection to the "New Collection" collection
    When I browse to the document with path "/default-domain/ws/File1"
    Then I can see the document belongs to the "New Collection" collection
    When I browse to the document with path "/default-domain/ws/File2"
    Then I can see the document belongs to the "New Collection" collection
