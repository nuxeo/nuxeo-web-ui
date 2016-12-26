Feature: Home

  I have a home page

  Background:
    Given I login as "Administrator"

  Scenario: My dashboard
    When I click the Nuxeo logo
    Then I can see my home
    And I have a "latestEditedDocs" card
    And I have a "latestViewedDocs" card
    And I have a "taskLists" card
    And I have a "favoriteDocs" card
