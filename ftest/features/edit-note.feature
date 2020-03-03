Feature: Edit Note

  Note is editable in all supported formats

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document
    And I have permission ReadWrite for this document

  Scenario Outline: Edit <format> Note
    Given I have a <format> Note
    When I browse to the document
    Then I can edit the Note metadata
    And I can edit the <format> Note

  Examples:
  | format   |
#  | HTML     |
  | XML      |
  | Markdown |
  | Text     |
