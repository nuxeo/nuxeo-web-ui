Feature: Vocabularies

  Vocabularies can be added, edit and removed.

  Background:
    Given user "John" exists in group "powerusers"
    And I login as "John"

  Scenario: Vocabularies menu on drawer
    When I click the "administration" button
    Then I can see the administration menu
    When I click "vocabulary-management" in the administration menu
    Then I can see the vocabulary page

  Scenario: Simple vocabulary create, edit, delete
    Given I am on vocabulary page
    When I select "continent" vocabulary
    Then I can see the vocabulary table
    And I have a non empty table
    And I cannot see "Brittany" entry
    And I cannot see "Breizh" entry
    And I can add "Brittany" entry
    And I can see "Brittany" entry
    And I can edit entry with index 8 and new label "Breizh"
    And I can see "Breizh" entry
    And I can delete entry with index 8
    And I cannot see "Breizh" entry
    And I cannot see "Brittany" entry

  Scenario: l10n vocabulary check
    Given I am on vocabulary page
    When I select "l10ncoverage" vocabulary
    Then I can see the vocabulary table
    And I can see create dialog
    And I can see edit dialog
