Feature: Favorites

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Favorites
    Given I have a HTML Note
    When I browse to the document
    Then I add the document to the favorites
    And I click the "favorites" button
    And I can see the document belongs to the favorites
    And I can remove the document from the favorites
