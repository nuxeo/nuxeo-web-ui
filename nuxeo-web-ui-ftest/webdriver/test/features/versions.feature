Feature: Versioning

  Versions management in document view

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario Outline: Create <versionType> version
    Given I have a File document
    And I have permission ReadWrite for this document
    When I browse to the document
    And The document is unversioned
    And I click the Create Version button
    Then The create version dialog appears
    And Version options 0.1 and 1.0 are presented
    When I create a <versionType> version
    Then The document version is <createdVersion>

    Examples:
      |versionType  | createdVersion  |
      |major        | 1.0             |
      |minor        | 0.1             |

  Scenario: View version
    Given I have a File document
    And I have permission ReadWrite for this document
    And This document has a minor version
    When I browse to the document
    And I click the versions list
    And I click the versions list at index 0
    Then I can see the version info bar with text "You're viewing the 0.1 version."

  Scenario: Edit version
    Given I have a File document
    And I have permission ReadWrite for this document
    And This document has a major version
    When I browse to the document
    And The document version is 1.0
    Then I can edit the Note metadata
    And The document version is 1.0+

  Scenario: Switch and restore version
    Given I have a File document
    And I have permission ReadWrite for this document
    And This document has a minor version
    And I browse to the document
    And The document version is 0.1
    Then I can edit the Note metadata
    And The document version is 0.1+
    And I click the versions list
    And I click the Create Version button in versions list
    Then The create version dialog appears
    And Version options 0.2 and 1.0 are presented
    When I create a major version
    Then The document version is 1.0
    And I click the versions list
    And Versions item index at 0 is 1.0
    And Versions item index at 1 is 0.1
    When I click the versions list at index 1
    And I can restore version
    And The document version is 1.0+