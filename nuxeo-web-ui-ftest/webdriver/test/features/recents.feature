Feature: Recents

  I can view recent documents

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: Recents
    When I click the "recents" button
    Then I can see the list of recently viewed documents
