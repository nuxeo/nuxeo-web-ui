Feature: Versioning

  Versions management in document view

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario Outline: Create version
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

  Scenario: Check in version
    Given I have a File document
    And I have permission ReadWrite for this document
    And This document has a version 1.0
    When I browse to the document
    And The document version is 1.0
    Then I can edit the Note metadata
    And The document version is 1.0+