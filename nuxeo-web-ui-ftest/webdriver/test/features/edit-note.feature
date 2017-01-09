Feature: Edit Note

  HTML Note is editable

  Background:
    Given I login as "Administrator"
    And I have a HTML Note

  Scenario: Note HTML editor
    When I browse to the document
    Then I can edit the Note metadata
    Then I can edit the Note content
