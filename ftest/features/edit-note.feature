Feature: Edit Note

  Note is editable in all supported formats

  Background:
    Given user "John" exists in group "members"
    And I login as "John"
    And I have a Workspace document

  Scenario Outline: Edit <format> Note with Read permission
    Given I have permission Read for this document
    And I have a <format> Note
    When I browse to the document
    Then I can't edit the Note

  Examples:
  | format   |
#  | HTML     |
  | XML      |
  | Markdown |
  | Text     |

  Scenario Outline: Edit <format> Note with WriteProperties permission
    Given I have permission WriteProperties for this document
    And I have a <format> Note
    When I browse to the document
    Then I can edit the <format> Note

  Examples:
  | format   |
#  | HTML     |
  | XML      |
  | Markdown |
  | Text     |

  Scenario Outline: Edit <format> Note
    Given I have permission ReadWrite for this document
    And I have a <format> Note
    When I browse to the document
    Then I can edit the Note metadata
    And I can edit the <format> Note

  Examples:
  | format   |
#  | HTML     |
  | XML      |
  | Markdown |
  | Text     |
