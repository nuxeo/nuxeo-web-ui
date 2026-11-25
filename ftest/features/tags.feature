Feature: Tags

  Background:
    Given I login as "Administrator"
    And I have a Workspace document
    And I have a File document

  Scenario: Pasting comma-separated tags adds all of them to the document
    When I browse to the document
    And I paste "tag1,tag2,tag3,tag4" in the document tags
    Then I can see the document has the tags "tag1,tag2,tag3,tag4"
    When I reload the page
    Then I can see the document has the tags "tag1,tag2,tag3,tag4"
