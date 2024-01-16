Feature: Activity

  Background: 
    Given I login as "Administrator"
    And I have a Workspace document

  Scenario: Validate entries in activity tab
    When I have a File document
    And This document has file "<file>" for content
    And I browse to the document
    Then I reload the page
    And I can see "created the document" in the Activity feed
    And I reload the page
    And I can see "viewed the document" in the Activity feed
    When I click the blob download button
    And I reload the page
    Then I can see "downloaded the document" in the Activity feed

    Examples: 
      | file       |
      | sample.png |
      