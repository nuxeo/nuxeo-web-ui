Feature: Recents

  I can view recent documents

  Background:
    Given I login as "Administrator"

  Scenario: Recents
    When I click the "recents" button
    Then I can see the list of recently viewed documents
