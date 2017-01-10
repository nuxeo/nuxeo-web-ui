@focus
Feature: Edit Note

  Note is editable in all supported formats

  Background:
    Given I login as "Administrator"

  Scenario Outline: Edit <format> Note
    Given I have a <format> Note
    When I browse to the document
    Then I can edit the Note metadata
    Then I can edit the <format> Note

  Examples:
  | format    |
  |  HTML     |
#  |  XML      |
#  |  Markdown |
#  |  Text     |