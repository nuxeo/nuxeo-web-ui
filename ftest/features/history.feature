Feature: History

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have a File document
    And I browse to the document

  Scenario: Validate entries in history tab
    When I can navigate to History pill
    Then I can see the history table
    And I have a non empty history table
    And I can see "Document created" entry in history table
