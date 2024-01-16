Feature: Upload

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a File document

  Scenario: Blob upload options for Read permission
    Given I have permission Read for this document
    When I browse to the document
    Then I can't see the option to add a main blob
    When This document has file "sample.png" for content
    And I browse to the document
    Then I can't see the blob replace button
    And I can't see the option to add new attachments

  Scenario: Blob upload options for WriteProperties permission
    Given I have permission WriteProperties for this document
    When I browse to the document
    Then I can see the option to add a main blob
    And I upload file "sample.png" as document content
    Then I can see the blob replace button
    And I can see the option to add new attachments
