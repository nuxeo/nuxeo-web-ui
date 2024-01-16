Feature: Audit

  Background: 
    Given I login as "Administrator"
    And I have a Workspace document
    And I have a Picture document
    And I browse to the document

  Scenario: Validate entries in audit tab for picture
    When I upload file "sample.png" as document content
    And I reload the page
    Then I click the "administration" button
    And I can see the administration menu
    When I click "audit" in the administration menu
    And I can see the audit page
    And I can see the audit table
    Then I have a non empty audit table
    And I can see "Download" entry in audit table
