Feature: Vocabularies

  Vocabularies can be added, edit and removed.

  Background:
    Given I login as "Administrator"

  Scenario: Vocabularies menu on drawer
    When I click the "administration" button
    Then I can see the administration menu
    When I click "Vocabularies" in the administration menu
    Then I can see the vocabulary page

  @watch
  Scenario: Vocabularies table
    Given I am on vocabulary page
    When I select "continent" vocabulary
    Then I can see the vocabulary table
    And I have a non empty table
    And I cannot see "Brittany" entry
    And I can add "Brittany" entry
    And I can see "Brittany" entry
    And I can delete "Brittany" entry
