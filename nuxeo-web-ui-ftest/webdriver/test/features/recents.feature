Feature: Recents

  I can view recent documents

  Background:
    When I login as "Administrator"
    And I go to the UI

  @ignore
  Scenario: Recents
    When I click the "recents" button
    Then I can see the list of recently viewed documents
