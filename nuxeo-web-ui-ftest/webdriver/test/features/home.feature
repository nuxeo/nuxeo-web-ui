Feature: Home

  I have a home page

  Background:
    Given I login as "Administrator"

  @ignore
  Scenario: My dashboard
    When I click the Nuxeo logo
    Then I can see my home
    And I have a "Recently Edited" card
    And I have a "Recently Viewed" card
    And I have a "Tasks" card
    And I have a "Favorite Items" card
