@ignore
Feature: Create Document

  I can create a Document

  Background:
    Given I login as "Administrator"

  Scenario Outline: Create <doctype>
    When I click the Create Document button
    And I select <doctype> from the Document Type menu
    And I create a <doctype>
    Then I see the <doctype> page

  Examples:
    |doctype  |
    |Note     |
    |File     |
    #|Picture  |
    #|Folder   |
    #|Workspace|
