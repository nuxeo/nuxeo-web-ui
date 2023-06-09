Feature: History

  Background: 
    Given I login as "Administrator"
    And I have a Workspace document

  Scenario: Validate entries in history tab
    When I have a File document
    And This document has file "<file>" for content
    And I browse to the document
    And I reload the page
    Then I can navigate to History pill
    And I can see the history table
    And I have a non empty history table
    And I can see "Document created" entry in history table
    And I can see "Download" entry in history table

    Examples: 
      | file       |
      | sample.png |
     
