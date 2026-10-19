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

  Scenario: Dropping several files at once on a single file dropzone is rejected
    Given I have permission WriteProperties for this document
    When I browse to the document
    Then I can see the option to add a main blob
    When I drop 3 files at once as document content
    Then I can see an error on the document content dropzone
    And I can't see the blob replace button
    When I drop 1 file at once as document content
    Then I can see the blob replace button
