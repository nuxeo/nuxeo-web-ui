Feature: Home

  I have a home page

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: My dashboard
    Given I am not on the home page
    When I click the home button
    Then I can see my home
    And I have a "latestEditedDocs" card
    And I have a "latestViewedDocs" card
    And I have a "tasksList" card
    And I have a "favoriteDocs" card
